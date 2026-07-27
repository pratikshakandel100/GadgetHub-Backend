import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { createAdminAndLogin } from "./setup/authHelpers";
import { createCategory, createPublishedProduct } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

const createSubcategory = async (adminToken: string, categoryId: string, overrides: Record<string, unknown> = {}) => {
    const res = await request(app)
        .post("/api/v1/subcategories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: `Subcat-${Date.now()}`, category: categoryId, ...overrides })
        .expect(201);
    return res.body.data;
};

describe("Subcategory duplicate-name guard", () => {
    it("rejects a duplicate subcategory name within the same category", async () => {
        const admin = await createAdminAndLogin();
        const category = await createCategory(admin.token);
        await createSubcategory(admin.token, category._id, { name: "Gaming" });

        const res = await request(app)
            .post("/api/v1/subcategories")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Gaming", category: category._id });

        expect(res.status).toBe(400);
    });

    it("allows the same subcategory name in a different category", async () => {
        const admin = await createAdminAndLogin();
        const categoryA = await createCategory(admin.token);
        const categoryB = await createCategory(admin.token);
        await createSubcategory(admin.token, categoryA._id, { name: "Accessories" });

        const res = await request(app)
            .post("/api/v1/subcategories")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Accessories", category: categoryB._id });

        expect(res.status).toBe(201);
    });
});

describe("Subcategory deletion guard", () => {
    it("refuses to delete a subcategory that still has products", async () => {
        const admin = await createAdminAndLogin();
        const category = await createCategory(admin.token);
        const subcategory = await createSubcategory(admin.token, category._id);
        await createPublishedProduct(admin.token, { category: category._id, subcategory: subcategory._id });

        const res = await request(app)
            .delete(`/api/v1/subcategories/${subcategory._id}`)
            .set("Authorization", `Bearer ${admin.token}`);

        expect(res.status).toBe(400);
    });
});
