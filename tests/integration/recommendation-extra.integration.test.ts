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

describe("Frequently bought together flow", () => {
    it("recommends a product that was purchased alongside it in the same order", async () => {
        const admin = await createAdminAndLogin();
        const productA = await createPublishedProduct(admin.token, { name: `Laptop-${Date.now()}` });
        const productB = await createPublishedProduct(admin.token, { name: `Mouse-${Date.now()}` });
        const user = await registerAndLogin();

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: productA._id, quantity: 1 }).expect(200);
        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: productB._id, quantity: 1 }).expect(200);
        const address = await createShippingAddress(user.token);
        await request(app)
            .post("/api/v1/orders")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ shippingAddressId: address._id, paymentMethod: "cod" })
            .expect(201);

        const res = await request(app).get(`/api/v1/recommendations/frequently-bought/${productA._id}`).expect(200);

        expect(res.body.data.some((p: any) => p._id === productB._id)).toBe(true);
    });

    it("returns an empty list when nothing has ever co-occurred with this product", async () => {
        const admin = await createAdminAndLogin();
        const lonelyProduct = await createPublishedProduct(admin.token);

        const res = await request(app).get(`/api/v1/recommendations/frequently-bought/${lonelyProduct._id}`).expect(200);

        expect(res.body.data).toEqual([]);
    });
});
