import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import User from "../../src/models/user.model";
import * as mailerUtil from "../../src/utils/mailer.util";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    jest.restoreAllMocks();
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Registration flow", () => {
    it("stores the new user in MongoDB with a hashed (not plain-text) password and returns success", async () => {
        const res = await request(app)
            .post("/api/v1/auth/register")
            .send({ fullname: "Jane Doe", email: "jane@example.com", password: "Password123" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.password).toBeUndefined(); // API response never leaks the password field

        const stored = await User.findOne({ email: "jane@example.com" });
        expect(stored).not.toBeNull();
        expect(stored!.password).not.toBe("Password123");
        expect(await bcrypt.compare("Password123", stored!.password!)).toBe(true);
    });
});

describe("Login flow", () => {
    it("logs in with valid credentials and returns a JWT plus the authenticated user", async () => {
        await request(app)
            .post("/api/v1/auth/register")
            .send({ fullname: "John Smith", email: "john@example.com", password: "Password123" })
            .expect(200);

        const res = await request(app).post("/api/v1/auth/login").send({ email: "john@example.com", password: "Password123" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.token).toBe("string");
        expect(res.body.data.user.email).toBe("john@example.com");
    });

    it("rejects login with an incorrect password", async () => {
        await request(app)
            .post("/api/v1/auth/register")
            .send({ fullname: "John Smith", email: "john2@example.com", password: "Password123" })
            .expect(200);

        const res = await request(app).post("/api/v1/auth/login").send({ email: "john2@example.com", password: "WrongPassword" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Invalid Password/i);
    });
});

describe("Forgot password flow", () => {
    it("generates an OTP, verifies it, resets the password, and allows login with the new password", async () => {
        const email = "reset-flow@example.com";
        await request(app).post("/api/v1/auth/register").send({ fullname: "Reset Flow", email, password: "OldPassword123" }).expect(200);

        let capturedOtp = "";
        jest.spyOn(mailerUtil, "sendPasswordResetOtpEmail").mockImplementation(async (_to, _name, otp) => {
            capturedOtp = otp;
        });

        await request(app).post("/api/v1/auth/forgot-password").send({ email }).expect(200);
        expect(capturedOtp).toMatch(/^\d{6}$/);

        const verifyRes = await request(app).post("/api/v1/auth/verify-reset-otp").send({ email, otp: capturedOtp }).expect(200);
        const resetToken = verifyRes.body.data.resetToken;
        expect(typeof resetToken).toBe("string");

        await request(app)
            .post("/api/v1/auth/reset-password")
            .send({ email, resetToken, password: "NewPassword456", confirmPassword: "NewPassword456" })
            .expect(200);

        const oldLogin = await request(app).post("/api/v1/auth/login").send({ email, password: "OldPassword123" });
        expect(oldLogin.status).toBe(400);

        const newLogin = await request(app).post("/api/v1/auth/login").send({ email, password: "NewPassword456" });
        expect(newLogin.status).toBe(200);
        expect(newLogin.body.data.user.email).toBe(email);
    });
});
