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

describe("Admin updates a user flow", () => {
    it("updates another user's full name", async () => {
        const admin = await createAdminAndLogin();
        const user = await registerAndLogin();

        const res = await request(app)
            .put(`/api/v1/admin/users/${user.userId}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ fullname: "Updated By Admin" })
            .expect(200);

        expect(res.body.data.fullname).toBe("Updated By Admin");
    });

    it("fetches a single user by id", async () => {
        const admin = await createAdminAndLogin();
        const user = await registerAndLogin();

        const res = await request(app)
            .get(`/api/v1/admin/users/${user.userId}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(res.body.data.email).toBe(user.email);
    });
});

describe("Admin deletes a user flow", () => {
    it("removes the user so they no longer appear in the list", async () => {
        const admin = await createAdminAndLogin();
        const user = await registerAndLogin();

        await request(app)
            .delete(`/api/v1/admin/users/${user.userId}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        const listRes = await request(app)
            .get("/api/v1/admin/users")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);
        expect(listRes.body.data.some((u: any) => u._id === user.userId)).toBe(false);
    });
});
