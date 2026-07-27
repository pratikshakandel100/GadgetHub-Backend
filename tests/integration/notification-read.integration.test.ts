import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { registerAndLogin, createAdminAndLogin } from "./setup/authHelpers";
import { createPublishedProduct, placeOrder } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Unread notification count flow", () => {
    it("increments the admin's unread count when a new order is placed", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const before = await request(app)
            .get("/api/v1/notifications/unread-count")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        await placeOrder(user.token, product._id);

        const after = await request(app)
            .get("/api/v1/notifications/unread-count")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(after.body.data.count).toBe(before.body.data.count + 1);
    });
});

describe("Mark all notifications as read flow", () => {
    it("zeroes out the unread count after marking all as read", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();
        await placeOrder(user.token, product._id);

        await request(app)
            .patch("/api/v1/notifications/read-all")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        const res = await request(app)
            .get("/api/v1/notifications/unread-count")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(res.body.data.count).toBe(0);
    });
});
