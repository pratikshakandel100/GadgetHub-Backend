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

describe("Update profile flow", () => {
    it("updates the user's full name and phone number", async () => {
        const user = await registerAndLogin();

        const res = await request(app)
            .put("/api/v1/auth/update")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ fullname: "Updated Name", phoneNumber: "9811111111" })
            .expect(200);

        expect(res.body.data.fullname).toBe("Updated Name");
        expect(res.body.data.phoneNumber).toBe("9811111111");
        expect(res.body.data.password).toBeUndefined();
    });

    it("reflects the update in whoami afterwards", async () => {
        const user = await registerAndLogin();
        await request(app)
            .put("/api/v1/auth/update")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ fullname: "Whoami Check" })
            .expect(200);

        const res = await request(app)
            .get("/api/v1/auth/whoami")
            .set("Authorization", `Bearer ${user.token}`)
            .expect(200);

        expect(res.body.data.fullname).toBe("Whoami Check");
    });

    it("rejects an update request without a valid token", async () => {
        const res = await request(app).put("/api/v1/auth/update").send({ fullname: "No Auth" });
        expect(res.status).toBe(401);
    });
});
