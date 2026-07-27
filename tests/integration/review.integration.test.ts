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

describe("Create review flow", () => {
    it("allows reviewing a product from a Delivered order", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const order = await placeOrder(user.token, product._id);
        await advanceOrderToDelivered(admin.token, order._id);

        const res = await request(app)
            .post("/api/v1/reviews")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ product: product._id, order: order._id, rating: 5, comment: "Excellent product, works great." })
            .expect(201);

        expect(res.body.data.rating).toBe(5);
    });
});

describe("Product review average rating flow", () => {
    it("computes the average rating across all reviews for a product", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const userA = await registerAndLogin();
        const userB = await registerAndLogin();

        const orderA = await placeOrder(userA.token, product._id);
        await advanceOrderToDelivered(admin.token, orderA._id);
        await request(app)
            .post("/api/v1/reviews")
            .set("Authorization", `Bearer ${userA.token}`)
            .send({ product: product._id, order: orderA._id, rating: 4, comment: "Pretty good overall." })
            .expect(201);

        const orderB = await placeOrder(userB.token, product._id);
        await advanceOrderToDelivered(admin.token, orderB._id);
        await request(app)
            .post("/api/v1/reviews")
            .set("Authorization", `Bearer ${userB.token}`)
            .send({ product: product._id, order: orderB._id, rating: 2, comment: "Not what I expected." })
            .expect(201);

        const res = await request(app).get(`/api/v1/reviews/product/${product._id}`).expect(200);

        expect(res.body.data.totalReviews).toBe(2);
        expect(res.body.data.averageRating).toBe(3);
    });
});
