import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { registerAndLogin, createAdminAndLogin } from "./setup/authHelpers";
import { createPublishedProduct, createShippingAddress } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Order-placed notification flow", () => {
    it("creates an admin notification when an order is placed, retrievable via the notifications API", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: product._id, quantity: 1 }).expect(200);
        const address = await createShippingAddress(user.token);
        const orderRes = await request(app)
            .post("/api/v1/orders")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ shippingAddressId: address._id, paymentMethod: "cod" })
            .expect(201);

        const notificationsRes = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${admin.token}`);

        expect(notificationsRes.status).toBe(200);
        const found = notificationsRes.body.data.find((n: any) => n.orderNumber === orderRes.body.data.orderNumber && n.type === "order_placed");
        expect(found).toBeDefined();
        expect(found.read).toBe(false);
    });
});

describe("Order-status-changed notification flow", () => {
    it("creates a customer notification and increments their unread count when an order's status changes", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: product._id, quantity: 1 }).expect(200);
        const address = await createShippingAddress(user.token);
        const orderRes = await request(app)
            .post("/api/v1/orders")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ shippingAddressId: address._id, paymentMethod: "cod" })
            .expect(201);

        const beforeCount = (await request(app).get("/api/v1/notifications/unread-count").set("Authorization", `Bearer ${user.token}`)).body.data.count;

        await request(app)
            .patch(`/api/v1/orders/${orderRes.body.data._id}/status`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ status: "Confirmed" })
            .expect(200);

        const afterRes = await request(app).get("/api/v1/notifications/unread-count").set("Authorization", `Bearer ${user.token}`);
        expect(afterRes.body.data.count).toBe(beforeCount + 1);

        const notificationsRes = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${user.token}`);
        const found = notificationsRes.body.data.find((n: any) => n.orderNumber === orderRes.body.data.orderNumber && n.type === "order_status_changed");
        expect(found).toBeDefined();
    });
});
