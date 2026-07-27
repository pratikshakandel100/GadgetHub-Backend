import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { registerAndLogin, createAdminAndLogin } from "./setup/authHelpers";
import { createPublishedProduct, placeOrder, advanceOrderToDelivered } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Order invoice download flow", () => {
    it("downloads a PDF invoice once the order has been delivered", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const order = await placeOrder(user.token, product._id);
        await advanceOrderToDelivered(admin.token, order._id);

        const res = await request(app)
            .get(`/api/v1/orders/${order._id}/invoice`)
            .set("Authorization", `Bearer ${user.token}`)
            .expect(200);

        expect(res.headers["content-type"]).toBe("application/pdf");
        expect(res.headers["content-disposition"]).toContain(order.orderNumber);
    });

    it("rejects downloading the invoice before the order is delivered", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const order = await placeOrder(user.token, product._id);

        const res = await request(app)
            .get(`/api/v1/orders/${order._id}/invoice`)
            .set("Authorization", `Bearer ${user.token}`);

        expect(res.status).toBe(400);
    });
});
