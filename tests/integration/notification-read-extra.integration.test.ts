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

describe("Mark a single notification as read flow", () => {
    it("marks the customer's order-status notification as read", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();
        const order = await placeOrder(user.token, product._id);

        await request(app)
            .patch(`/api/v1/orders/${order._id}/status`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ status: "Confirmed" })
            .expect(200);

        const listRes = await request(app)
            .get("/api/v1/notifications")
            .set("Authorization", `Bearer ${user.token}`)
            .expect(200);
        const notification = listRes.body.data.find((n: any) => n.orderNumber === order.orderNumber);
        expect(notification).toBeDefined();
        expect(notification.read).toBe(false);

        const readRes = await request(app)
            .patch(`/api/v1/notifications/${notification._id}/read`)
            .set("Authorization", `Bearer ${user.token}`)
            .expect(200);

        expect(readRes.body.data.read).toBe(true);
    });

    it("rejects marking another user's notification as read", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const userA = await registerAndLogin();
        const userB = await registerAndLogin();
        const order = await placeOrder(userA.token, product._id);

        await request(app)
            .patch(`/api/v1/orders/${order._id}/status`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ status: "Confirmed" })
            .expect(200);

        const listRes = await request(app)
            .get("/api/v1/notifications")
            .set("Authorization", `Bearer ${userA.token}`)
            .expect(200);
        const notification = listRes.body.data.find((n: any) => n.orderNumber === order.orderNumber);

        const res = await request(app)
            .patch(`/api/v1/notifications/${notification._id}/read`)
            .set("Authorization", `Bearer ${userB.token}`);

        expect(res.status).toBe(404);
    });
});
