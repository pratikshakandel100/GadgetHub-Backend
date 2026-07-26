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

describe("Order total calculation across multiple items", () => {
    it("sums each item's price x quantity into the subtotal, and adds shipping to reach the grand total", async () => {
        const admin = await createAdminAndLogin();
        const productA = await createPublishedProduct(admin.token, { sellingPrice: 500 });
        const productB = await createPublishedProduct(admin.token, { sellingPrice: 250 });
        const user = await registerAndLogin();

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: productA._id, quantity: 2 }).expect(200);
        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: productB._id, quantity: 3 }).expect(200);

        await request(app)
            .put("/api/v1/shipping-settings")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({
                warehouseName: "Main Warehouse",
                warehouseAddress: "Kathmandu",
                warehouseLatitude: 27.7172,
                warehouseLongitude: 85.324,
                baseShippingCharge: 150,
                pricePerKm: 0,
                minShippingCharge: 150,
                maxShippingCharge: 150,
                freeShippingThreshold: 0,
            })
            .expect(200);
        const address = await createShippingAddress(user.token);

        const orderRes = await request(app)
            .post("/api/v1/orders")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ shippingAddressId: address._id, paymentMethod: "cod" });

        expect(orderRes.status).toBe(201);
        const expectedSubtotal = 500 * 2 + 250 * 3;
        expect(orderRes.body.data.subtotal).toBe(expectedSubtotal);
        expect(orderRes.body.data.shippingFee).toBe(150);
        expect(orderRes.body.data.total).toBe(expectedSubtotal + 150);
    });
});
