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

describe("Shipping address snapshot flow", () => {
    it("stores a snapshot of the shipping address on the order at checkout time", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });
        const user = await registerAndLogin();

        const address = await createShippingAddress(user.token, {
            fullName: "Snapshot Test",
            street: "Snapshot Street",
            wardNumber: 9,
        });

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: product._id, quantity: 1 }).expect(200);
        const orderRes = await request(app)
            .post("/api/v1/orders")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ shippingAddressId: address._id, paymentMethod: "cod" })
            .expect(201);

        expect(orderRes.body.data.shippingAddress.fullName).toBe("Snapshot Test");
        expect(orderRes.body.data.shippingAddress.street).toBe("Snapshot Street");
        expect(orderRes.body.data.shippingAddress.wardNumber).toBe(9);
    });
});

describe("Distance-based shipping calculation flow", () => {
    it("calculates the shipping charge from the customer's location and reflects it in the order total", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5, sellingPrice: 1000 });
        const user = await registerAndLogin();

        await request(app)
            .put("/api/v1/shipping-settings")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({
                warehouseName: "Main Warehouse",
                warehouseAddress: "Kathmandu",
                warehouseLatitude: 27.7172,
                warehouseLongitude: 85.324,
                baseShippingCharge: 100,
                pricePerKm: 10,
                minShippingCharge: 50,
                maxShippingCharge: 500,
                freeShippingThreshold: 0,
            })
            .expect(200);

        const address = await createShippingAddress(user.token, { latitude: 27.72, longitude: 85.33 });

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: product._id, quantity: 1 }).expect(200);

        const quoteRes = await request(app)
            .post("/api/v1/shipping-settings/quote")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ shippingAddressId: address._id })
            .expect(200);

        expect(quoteRes.body.data.shippingFee).toBeGreaterThan(0);

        const orderRes = await request(app)
            .post("/api/v1/orders")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ shippingAddressId: address._id, paymentMethod: "cod" })
            .expect(201);

        expect(orderRes.body.data.shippingFee).toBe(quoteRes.body.data.shippingFee);
        expect(orderRes.body.data.total).toBe(orderRes.body.data.subtotal + orderRes.body.data.shippingFee);
    });
});
