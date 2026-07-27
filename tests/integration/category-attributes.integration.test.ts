import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { createAdminAndLogin } from "./setup/authHelpers";
import { createCategory, createBrand } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Category attribute schema flow", () => {
    it("saves and retrieves a category's attribute schema", async () => {
        const admin = await createAdminAndLogin();
        const category = await createCategory(admin.token);

        await request(app)
            .post(`/api/v1/categories/${category._id}/attributes`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ attributeSchema: [{ key: "ram", label: "RAM", type: "text", required: true }] })
            .expect(200);

        const res = await request(app)
            .get(`/api/v1/categories/${category._id}/attributes`)
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].key).toBe("ram");
    });

    it("enforces a required category attribute when creating a product", async () => {
        const admin = await createAdminAndLogin();
        const category = await createCategory(admin.token);
        const brand = await createBrand(admin.token);
        await request(app)
            .post(`/api/v1/categories/${category._id}/attributes`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ attributeSchema: [{ key: "ram", label: "RAM", type: "text", required: true }] })
            .expect(200);

        const missingAttrRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({
                name: "Test Laptop",
                category: category._id,
                brand: brand._id,
                shortDescription: "short",
                fullDescription: "full",
                costPrice: 100,
                originalPrice: 200,
                sellingPrice: 150,
                stockQuantity: 10,
                status: "Published",
                attributes: {},
            });
        expect(missingAttrRes.status).toBe(400);

        const withAttrRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({
                name: "Test Laptop",
                category: category._id,
                brand: brand._id,
                shortDescription: "short",
                fullDescription: "full",
                costPrice: 100,
                originalPrice: 200,
                sellingPrice: 150,
                stockQuantity: 10,
                status: "Published",
                attributes: { ram: "16GB" },
            });
        expect(withAttrRes.status).toBe(201);
    });
});
