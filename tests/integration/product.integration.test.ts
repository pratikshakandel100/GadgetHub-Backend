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

describe("Admin product creation flow", () => {
    it("creates a category, a brand and a product, and persists the product in MongoDB", async () => {
        const admin = await createAdminAndLogin();
        const category = await createCategory(admin.token, { name: "Laptops" });
        const brand = await createBrand(admin.token, { name: "Dell" });

        const createRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({
                name: "XPS 13",
                category: category._id,
                brand: brand._id,
                shortDescription: "short",
                fullDescription: "full",
                costPrice: 800,
                originalPrice: 1200,
                sellingPrice: 1100,
                stockQuantity: 10,
                status: "Published",
            });

        expect(createRes.status).toBe(201);
        expect(createRes.body.success).toBe(true);

        const stored = await Product.findById(createRes.body.data._id);
        expect(stored).not.toBeNull();
        expect(stored!.name).toBe("XPS 13");
        expect(stored!.sellingPrice).toBe(1100);
    });
});

describe("Product update flow", () => {
    it("updates a product's values and returns them correctly when fetched again", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { name: "Old Name", sellingPrice: 100 });

        const updateRes = await request(app)
            .put(`/api/v1/products/${product._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "New Name", sellingPrice: 999 });
        expect(updateRes.status).toBe(200);

        const fetchRes = await request(app).get(`/api/v1/products/${product._id}`).set("Authorization", `Bearer ${admin.token}`);

        expect(fetchRes.status).toBe(200);
        expect(fetchRes.body.data.name).toBe("New Name");
        expect(fetchRes.body.data.sellingPrice).toBe(999);
    });
});

describe("Product deletion flow", () => {
    it("deletes a product and confirms it no longer exists", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token);

        const deleteRes = await request(app).delete(`/api/v1/products/${product._id}`).set("Authorization", `Bearer ${admin.token}`);
        expect(deleteRes.status).toBe(200);

        const stored = await Product.findById(product._id);
        expect(stored).toBeNull();
    });
});

describe("Product search flow", () => {
    it("finds the matching published product by keyword among several inserted products", async () => {
        const admin = await createAdminAndLogin();
        await createPublishedProduct(admin.token, { name: "Mechanical Gaming Keyboard" });
        await createPublishedProduct(admin.token, { name: "Wireless Ergonomic Mouse" });
        await createPublishedProduct(admin.token, { name: "USB-C Charging Cable" });

        const res = await request(app).get("/api/v1/products/search").query({ q: "Keyboard" });

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((p: any) => p.name.toLowerCase().includes("keyboard"))).toBe(true);
    });
});
