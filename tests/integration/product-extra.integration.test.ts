import request from "supertest";
import app from "../../src/app";
import Product from "../../src/models/product.model";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { createAdminAndLogin } from "./setup/authHelpers";
import { createCategory, createBrand, createPublishedProduct } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Duplicate variant handling", () => {
    it("restocks the existing product instead of creating a duplicate when the same variant is submitted twice", async () => {
        const admin = await createAdminAndLogin();
        const category = await createCategory(admin.token);
        const brand = await createBrand(admin.token);
        const basePayload = {
            name: "Galaxy Buds",
            category: category._id,
            brand: brand._id,
            shortDescription: "short",
            fullDescription: "full",
            costPrice: 50,
            originalPrice: 100,
            sellingPrice: 90,
            status: "Published",
            variantAttributes: [{ key: "Color", value: "Black" }],
        };

        const firstRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ ...basePayload, stockQuantity: 10 });
        expect(firstRes.status).toBe(201);

        const secondRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ ...basePayload, stockQuantity: 5 });

        expect(secondRes.status).toBe(200);
        expect(secondRes.body.data._id).toBe(firstRes.body.data._id);
        expect(secondRes.body.message).toMatch(/matching variant already exists/i);

        const matchingProducts = await Product.find({ name: "Galaxy Buds" });
        expect(matchingProducts).toHaveLength(1);
        expect(matchingProducts[0].stockQuantity).toBe(15);
    });
});

describe("Publish product flow", () => {
    it("moves a Draft product to Published via the status endpoint", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { status: "Draft" });
        expect(product.status).toBe("Draft");

        const res = await request(app)
            .patch(`/api/v1/products/${product._id}/status`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ status: "Published" });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("Published");
    });
});

describe("Filter products by category", () => {
    it("returns only published products belonging to the requested category", async () => {
        const admin = await createAdminAndLogin();
        const categoryA = await createCategory(admin.token, { name: "Category A" });
        const categoryB = await createCategory(admin.token, { name: "Category B" });

        const productInA = await createPublishedProduct(admin.token, { category: categoryA._id, name: "Product In A" });
        await createPublishedProduct(admin.token, { category: categoryB._id, name: "Product In B" });

        const res = await request(app).get("/api/v1/products/published").query({ category: categoryA._id });

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((p: any) => p._id === productInA._id)).toBe(true);
    });
});

describe("Retrieve product details", () => {
    it("fetches a single published product's full details by id", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { name: "Detail Test Product", sellingPrice: 777 });

        const res = await request(app).get(`/api/v1/products/published/${product._id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe("Detail Test Product");
        expect(res.body.data.sellingPrice).toBe(777);
    });
});
