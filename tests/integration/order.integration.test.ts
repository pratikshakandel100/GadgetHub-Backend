import request from "supertest";
import app from "../../src/app";
import Product from "../../src/models/product.model";
import Notification from "../../src/models/notification.model";
import { EsewaService, computeEsewaTotal } from "../../src/services/esewa.service";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { registerAndLogin, createAdminAndLogin, TestUser } from "./setup/authHelpers";
import { createPublishedProduct, createShippingAddress } from "./setup/dataHelpers";

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

/** Adds one unit of `product` to `user`'s cart, saves a shipping address, and checks out. */
const checkout = async (user: TestUser, productId: string, paymentMethod: "cod" | "online") => {
    await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId, quantity: 1 }).expect(200);
    const address = await createShippingAddress(user.token);
    const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ shippingAddressId: address._id, paymentMethod });
    return res;
};

describe("COD checkout flow", () => {
    it("creates the order, deducts stock immediately, and raises an admin notification", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 10 });
        const user = await registerAndLogin();

        const orderRes = await checkout(user, product._id, "cod");

        expect(orderRes.status).toBe(201);
        expect(orderRes.body.data.paymentStatus).toBe("Pending");

        const updatedProduct = await Product.findById(product._id);
        expect(updatedProduct!.stockQuantity).toBe(9);

        const adminNotification = await Notification.findOne({ audience: "admin", type: "order_placed", orderNumber: orderRes.body.data.orderNumber });
        expect(adminNotification).not.toBeNull();
    });
});

describe("eSewa checkout flow (mocked payment gateway)", () => {
    it("marks the order Paid and deducts stock once the (mocked) payment is confirmed successful", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 10 });
        const user = await registerAndLogin();

        const orderRes = await checkout(user, product._id, "online");
        expect(orderRes.status).toBe(201);
        const orderId = orderRes.body.data._id;

        // Stock is deferred for online orders until payment is verified.
        expect((await Product.findById(product._id))!.stockQuantity).toBe(10);

        await request(app).post("/api/v1/payments/esewa/initiate").set("Authorization", `Bearer ${user.token}`).send({ orderId }).expect(200);

        const expectedTotal = computeEsewaTotal(orderRes.body.data.subtotal, orderRes.body.data.shippingFee);
        jest.spyOn(EsewaService.prototype, "verifyTransaction").mockResolvedValue({
            product_code: "EPAYTEST",
            transaction_uuid: "mock-uuid",
            total_amount: expectedTotal,
            status: "COMPLETE",
            ref_id: "MOCK-REF-1",
        });

        // No `data` param is sent, so PaymentService looks the order up by `oid`
        // directly and relies solely on the mocked status-check for trust.
        const successRes = await request(app).get("/api/v1/payments/esewa/success").query({ oid: orderId });
        expect(successRes.status).toBe(302);
        expect(successRes.headers.location).toContain("status=success");

        const paidOrderRes = await request(app).get(`/api/v1/orders/${orderId}`).set("Authorization", `Bearer ${user.token}`);
        expect(paidOrderRes.body.data.paymentStatus).toBe("Paid");
        expect((await Product.findById(product._id))!.stockQuantity).toBe(9);
    });
});

describe("Order cancellation flow", () => {
    it("restores stock, saves the cancel reason, and notifies the customer", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 10 });
        const user = await registerAndLogin();

        const orderRes = await checkout(user, product._id, "cod");
        const orderId = orderRes.body.data._id;
        expect((await Product.findById(product._id))!.stockQuantity).toBe(9);

        const cancelRes = await request(app)
            .patch(`/api/v1/orders/${orderId}/cancel`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ reason: "Customer Request" });

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.status).toBe("Cancelled");
        expect(cancelRes.body.data.cancelReason).toBe("Customer Request");
        expect((await Product.findById(product._id))!.stockQuantity).toBe(10);

        const customerNotification = await Notification.findOne({ audience: "user", type: "order_status_changed", orderNumber: orderRes.body.data.orderNumber });
        expect(customerNotification).not.toBeNull();
    });
});

describe("Order status transition flow", () => {
    it("walks an order through every valid transition: Pending -> Confirmed -> Packed -> Shipped -> Delivered", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const orderRes = await checkout(user, product._id, "cod");
        const orderId = orderRes.body.data._id;
        const authHeader = `Bearer ${admin.token}`;

        const confirmRes = await request(app).patch(`/api/v1/orders/${orderId}/status`).set("Authorization", authHeader).send({ status: "Confirmed" });
        expect(confirmRes.status).toBe(200);
        expect(confirmRes.body.data.status).toBe("Confirmed");

        const packRes = await request(app).patch(`/api/v1/orders/${orderId}/status`).set("Authorization", authHeader).send({ status: "Packed" });
        expect(packRes.status).toBe(200);
        expect(packRes.body.data.status).toBe("Packed");

        const shipRes = await request(app)
            .patch(`/api/v1/orders/${orderId}/ship`)
            .set("Authorization", authHeader)
            .send({ courier: "NCM Courier", trackingNumber: "TRACK123" });
        expect(shipRes.status).toBe(200);
        expect(shipRes.body.data.status).toBe("Shipped");

        const deliverRes = await request(app)
            .patch(`/api/v1/orders/${orderId}/deliver`)
            .set("Authorization", authHeader)
            .send({ deliveryPersonName: "Ram Bahadur", deliveryPersonPhone: "9800000001" });
        expect(deliverRes.status).toBe(200);
        expect(deliverRes.body.data.status).toBe("Delivered");
    });

    it("rejects a status update that skips a required step (Pending -> Packed)", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const orderRes = await checkout(user, product._id, "cod");
        const orderId = orderRes.body.data._id;

        const res = await request(app)
            .patch(`/api/v1/orders/${orderId}/status`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ status: "Packed" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);

        const stillPending = await request(app).get(`/api/v1/orders/${orderId}`).set("Authorization", `Bearer ${admin.token}`);
        expect(stillPending.body.data.status).toBe("Pending");
    });
});
