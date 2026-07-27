import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { createAdminAndLogin, registerAndLogin } from "./setup/authHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

const createMethod = async (adminToken: string, overrides: Record<string, unknown> = {}) => {
    const res = await request(app)
        .post("/api/v1/shipping-methods")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: `Method-${Date.now()}`, charge: 100, estimatedDelivery: "3-5 days", ...overrides })
        .expect(201);
    return res.body.data;
};

describe("Active shipping methods flow", () => {
    it("only lists active methods for the checkout picker", async () => {
        const admin = await createAdminAndLogin();
        await createMethod(admin.token, { name: "Active One", isActive: true });
        await createMethod(admin.token, { name: "Inactive One", isActive: false });
        const user = await registerAndLogin();

        const res = await request(app)
            .get("/api/v1/shipping-methods/active")
            .set("Authorization", `Bearer ${user.token}`)
            .expect(200);

        const names = res.body.data.map((m: any) => m.name);
        expect(names).toContain("Active One");
        expect(names).not.toContain("Inactive One");
    });
});

describe("Update and delete shipping method flow", () => {
    it("updates the charge on an existing method", async () => {
        const admin = await createAdminAndLogin();
        const method = await createMethod(admin.token, { charge: 100 });

        const res = await request(app)
            .put(`/api/v1/shipping-methods/${method._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ charge: 250 })
            .expect(200);

        expect(res.body.data.charge).toBe(250);
    });

    it("deletes a shipping method", async () => {
        const admin = await createAdminAndLogin();
        const method = await createMethod(admin.token);

        await request(app)
            .delete(`/api/v1/shipping-methods/${method._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        const listRes = await request(app)
            .get("/api/v1/shipping-methods")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);
        expect(listRes.body.data.some((m: any) => m._id === method._id)).toBe(false);
    });
});
