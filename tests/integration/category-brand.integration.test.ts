import request from "supertest";
import app from "../../src/app";
import Category from "../../src/models/category.model";
import Brand from "../../src/models/brand.model";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { createAdminAndLogin } from "./setup/authHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Category management", () => {
    it("creates a category and persists it in MongoDB", async () => {
        const admin = await createAdminAndLogin();

        const res = await request(app).post("/api/v1/categories").set("Authorization", `Bearer ${admin.token}`).send({ name: "Smartphones" });

        expect(res.status).toBe(201);
        const stored = await Category.findById(res.body.data._id);
        expect(stored).not.toBeNull();
        expect(stored!.name).toBe("Smartphones");
    });

    it("updates a category's name and description", async () => {
        const admin = await createAdminAndLogin();
        const createRes = await request(app).post("/api/v1/categories").set("Authorization", `Bearer ${admin.token}`).send({ name: "Old Name" });

        const updateRes = await request(app)
            .put(`/api/v1/categories/${createRes.body.data._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Updated Name", description: "Updated description" });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.name).toBe("Updated Name");
        expect(updateRes.body.data.description).toBe("Updated description");
    });

    it("deletes a category and confirms it no longer exists", async () => {
        const admin = await createAdminAndLogin();
        const createRes = await request(app).post("/api/v1/categories").set("Authorization", `Bearer ${admin.token}`).send({ name: "To Delete" });

        const deleteRes = await request(app).delete(`/api/v1/categories/${createRes.body.data._id}`).set("Authorization", `Bearer ${admin.token}`);
        expect(deleteRes.status).toBe(200);

        expect(await Category.findById(createRes.body.data._id)).toBeNull();
    });
});

describe("Brand management", () => {
    it("creates a brand and persists it in MongoDB", async () => {
        const admin = await createAdminAndLogin();

        const res = await request(app).post("/api/v1/brands").set("Authorization", `Bearer ${admin.token}`).send({ name: "Samsung" });

        expect(res.status).toBe(200);
        const stored = await Brand.findById(res.body.data._id);
        expect(stored).not.toBeNull();
        expect(stored!.name).toBe("Samsung");
    });

    it("updates a brand's name", async () => {
        const admin = await createAdminAndLogin();
        const createRes = await request(app).post("/api/v1/brands").set("Authorization", `Bearer ${admin.token}`).send({ name: "Old Brand" });

        const updateRes = await request(app)
            .put(`/api/v1/brands/${createRes.body.data._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "New Brand" });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.name).toBe("New Brand");
    });

    it("deletes a brand and confirms it no longer exists", async () => {
        const admin = await createAdminAndLogin();
        const createRes = await request(app).post("/api/v1/brands").set("Authorization", `Bearer ${admin.token}`).send({ name: "To Delete" });

        const deleteRes = await request(app).delete(`/api/v1/brands/${createRes.body.data._id}`).set("Authorization", `Bearer ${admin.token}`);
        expect(deleteRes.status).toBe(200);

        expect(await Brand.findById(createRes.body.data._id)).toBeNull();
    });
});
