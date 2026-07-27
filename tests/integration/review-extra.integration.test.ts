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

describe("Review eligibility guard", () => {
    it("rejects reviewing a product from an order that hasn't been delivered yet", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const order = await placeOrder(user.token, product._id);

        const res = await request(app)
            .post("/api/v1/reviews")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ product: product._id, order: order._id, rating: 5, comment: "Trying to review too early." });

        expect(res.status).toBe(400);
    });
});

describe("Admin review moderation flow", () => {
    it("flags a review then deletes it", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const order = await placeOrder(user.token, product._id);
        const headers = { Authorization: `Bearer ${admin.token}` };
        await request(app).patch(`/api/v1/orders/${order._id}/status`).set(headers).send({ status: "Confirmed" }).expect(200);
        await request(app).patch(`/api/v1/orders/${order._id}/status`).set(headers).send({ status: "Packed" }).expect(200);
        await request(app).patch(`/api/v1/orders/${order._id}/ship`).set(headers).send({ courier: "NCM", trackingNumber: "T1" }).expect(200);
        await request(app)
            .patch(`/api/v1/orders/${order._id}/deliver`)
            .set(headers)
            .send({ deliveryPersonName: "Ram", deliveryPersonPhone: "9800000001" })
            .expect(200);

        const reviewRes = await request(app)
            .post("/api/v1/reviews")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ product: product._id, order: order._id, rating: 1, comment: "Inappropriate content here." })
            .expect(201);
        const reviewId = reviewRes.body.data._id;

        const flagRes = await request(app)
            .patch(`/api/v1/reviews/${reviewId}/status`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ status: "Flagged" })
            .expect(200);
        expect(flagRes.body.data.status).toBe("Flagged");

        const listRes = await request(app)
            .get("/api/v1/reviews/admin/all")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);
        expect(listRes.body.data.some((r: any) => r._id === reviewId)).toBe(true);

        await request(app)
            .delete(`/api/v1/reviews/${reviewId}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        const afterDeleteRes = await request(app)
            .get("/api/v1/reviews/admin/all")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);
        expect(afterDeleteRes.body.data.some((r: any) => r._id === reviewId)).toBe(false);
    });
});
