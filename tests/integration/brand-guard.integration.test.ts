import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { createAdminAndLogin } from "./setup/authHelpers";
import { createBrand, createPublishedProduct } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Brand deletion guard", () => {
    it("refuses to delete a brand that still has products", async () => {
        const admin = await createAdminAndLogin();
        const brand = await createBrand(admin.token);
        await createPublishedProduct(admin.token, { brand: brand._id });

        const res = await request(app)
            .delete(`/api/v1/brands/${brand._id}`)
            .set("Authorization", `Bearer ${admin.token}`);

        expect(res.status).toBe(400);
    });

    it("deletes a brand with no products", async () => {
        const admin = await createAdminAndLogin();
        const brand = await createBrand(admin.token);

        await request(app)
            .delete(`/api/v1/brands/${brand._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);
    });
});

describe("Brand rename guard", () => {
    it("rejects renaming a brand to a name already used by another brand", async () => {
        const admin = await createAdminAndLogin();
        await createBrand(admin.token, { name: "Dell" });
        const brandB = await createBrand(admin.token, { name: "HP" });

        const res = await request(app)
            .put(`/api/v1/brands/${brandB._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Dell" });

        expect(res.status).toBe(400);
    });
});
