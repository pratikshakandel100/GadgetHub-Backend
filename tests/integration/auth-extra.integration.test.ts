import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { registerAndLogin } from "./setup/authHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Duplicate registration", () => {
    it("rejects registering a second account with an email that's already taken", async () => {
        const email = "duplicate@example.com";
        await request(app).post("/api/v1/auth/register").send({ fullname: "First", email, password: "Password123" }).expect(200);

        const secondRes = await request(app).post("/api/v1/auth/register").send({ fullname: "Second", email, password: "AnotherPass456" });

        expect(secondRes.status).toBe(400);
        expect(secondRes.body.success).toBe(false);
        expect(secondRes.body.message).toMatch(/already exists/i);
    });
});

describe("Protected route access", () => {
    it("allows access to a protected route (whoami) with a valid JWT", async () => {
        const user = await registerAndLogin();

        const res = await request(app).get("/api/v1/auth/whoami").set("Authorization", `Bearer ${user.token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(user.email);
    });

    it("rejects access to a protected route without a JWT", async () => {
        const res = await request(app).get("/api/v1/auth/whoami");

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe("Change password flow", () => {
    it("verifies the current password, updates it, and allows login with the new one", async () => {
        const user = await registerAndLogin({ password: "OldPassword123" });

        const updateRes = await request(app)
            .put("/api/v1/auth/update")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ currentPassword: "OldPassword123", password: "BrandNewPassword456" });
        expect(updateRes.status).toBe(200);

        const oldLogin = await request(app).post("/api/v1/auth/login").send({ email: user.email, password: "OldPassword123" });
        expect(oldLogin.status).toBe(400);

        const newLogin = await request(app).post("/api/v1/auth/login").send({ email: user.email, password: "BrandNewPassword456" });
        expect(newLogin.status).toBe(200);
    });

    it("rejects a password change when the current password is wrong", async () => {
        const user = await registerAndLogin({ password: "OldPassword123" });

        const res = await request(app)
            .put("/api/v1/auth/update")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ currentPassword: "WrongCurrentPassword", password: "BrandNewPassword456" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/current password is incorrect/i);
    });
});
