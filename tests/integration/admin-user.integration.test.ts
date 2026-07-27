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

describe("Admin creates a user flow", () => {
    it("creates a new admin account and it appears in the user list", async () => {
        const admin = await createAdminAndLogin();

        const createRes = await request(app)
            .post("/api/v1/admin/users")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ fullname: "Second Admin", email: `second-admin-${Date.now()}@example.com`, password: "Password123", role: "admin" })
            .expect(200);

        expect(createRes.body.data.role).toBe("admin");
        expect(createRes.body.data.password).toBeUndefined();

        const listRes = await request(app)
            .get("/api/v1/admin/users")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(listRes.body.data.some((u: any) => u._id === createRes.body.data._id)).toBe(true);
    });

    it("rejects a non-admin from listing users", async () => {
        const user = await registerAndLogin();
        const res = await request(app).get("/api/v1/admin/users").set("Authorization", `Bearer ${user.token}`);
        expect(res.status).toBe(403);
    });
});
