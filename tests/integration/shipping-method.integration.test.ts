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

describe("Admin shipping method creation flow", () => {
    it("creates a shipping method and lists it", async () => {
        const admin = await createAdminAndLogin();

        const createRes = await request(app)
            .post("/api/v1/shipping-methods")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Express", charge: 200, estimatedDelivery: "1-2 days" })
            .expect(201);

        expect(createRes.body.data.isActive).toBe(true);

        const listRes = await request(app)
            .get("/api/v1/shipping-methods")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(listRes.body.data.some((m: any) => m.name === "Express")).toBe(true);
    });

    it("rejects a duplicate shipping method name", async () => {
        const admin = await createAdminAndLogin();
        await request(app)
            .post("/api/v1/shipping-methods")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Standard", charge: 100, estimatedDelivery: "3-5 days" })
            .expect(201);

        const res = await request(app)
            .post("/api/v1/shipping-methods")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ name: "Standard", charge: 150, estimatedDelivery: "2-4 days" });

        expect(res.status).toBe(400);
    });

    it("rejects a non-admin from creating a shipping method", async () => {
        const user = await registerAndLogin();
        const res = await request(app)
            .post("/api/v1/shipping-methods")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ name: "Sneaky", charge: 10, estimatedDelivery: "1 day" });

        expect(res.status).toBe(403);
    });
});
