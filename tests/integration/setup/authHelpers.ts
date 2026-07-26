import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../../src/app";
import User from "../../../src/models/user.model";

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

export interface TestUser {
    token: string;
    userId: string;
    email: string;
    password: string;
}

/** Registers and logs in a regular user through the real HTTP API. */
export const registerAndLogin = async (overrides: Partial<{ fullname: string; email: string; password: string }> = {}): Promise<TestUser> => {
    const email = overrides.email ?? `user-${unique()}@example.com`;
    const password = overrides.password ?? "Password123";

    await request(app)
        .post("/api/v1/auth/register")
        .send({ fullname: overrides.fullname ?? "Test User", email, password })
        .expect(200);

    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200);

    return { token: loginRes.body.data.token, userId: loginRes.body.data.user._id, email, password };
};

/**
 * Seeds an admin directly in the database (the public register endpoint can
 * never create an admin) then logs in through the real /login endpoint, so
 * the JWT returned is still genuinely issued by the real auth flow.
 */
export const createAdminAndLogin = async (): Promise<TestUser> => {
    const email = `admin-${unique()}@example.com`;
    const password = "AdminPass123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({ fullname: "Admin User", email, password: hashedPassword, role: "admin" });
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200);

    return { token: loginRes.body.data.token, userId: admin._id.toString(), email, password };
};
