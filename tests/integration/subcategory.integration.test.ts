import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { createAdminAndLogin } from "./setup/authHelpers";
import { createCategory } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Subcategory creation flow", () => {
    it("creates a subcategory under a category and lists it as published", async () => {
        const admin = await createAdminAndLogin();
        const category = await createCategory(admin.token);

        const createRes = await request(app)
            .post("/api/v1/subcategories")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Gaming Laptops", category: category._id })
            .expect(201);

        expect(createRes.body.data.slug).toBe("gaming-laptops");

        const publishedRes = await request(app)
            .get("/api/v1/subcategories/published")
            .query({ category: category._id })
            .expect(200);

        expect(publishedRes.body.data.some((s: any) => s._id === createRes.body.data._id)).toBe(true);
    });

    it("rejects creating a subcategory under a category that doesn't exist", async () => {
        const admin = await createAdminAndLogin();
        const res = await request(app)
            .post("/api/v1/subcategories")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Orphan", category: "507f1f77bcf86cd799439011" });

        expect(res.status).toBe(404);
    });
});
