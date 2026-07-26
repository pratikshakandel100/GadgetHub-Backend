import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { registerAndLogin, createAdminAndLogin } from "./setup/authHelpers";
import { createPublishedProduct } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Remove from wishlist", () => {
    it("removes a product from the wishlist and it no longer appears there", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token);
        const user = await registerAndLogin();

        await request(app).post("/api/v1/wishlist").set("Authorization", `Bearer ${user.token}`).send({ productId: product._id }).expect(200);

        const removeRes = await request(app).delete(`/api/v1/wishlist/${product._id}`).set("Authorization", `Bearer ${user.token}`);
        expect(removeRes.status).toBe(200);
        expect(removeRes.body.data.products.some((p: any) => p._id === product._id)).toBe(false);
    });
});

describe("Add to cart", () => {
    it("adds a product to an empty cart", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token);
        const user = await registerAndLogin();

        const res = await request(app)
            .post("/api/v1/cart")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ productId: product._id, quantity: 3 });

        expect(res.status).toBe(200);
        const item = res.body.data.items.find((i: any) => i.product._id === product._id);
        expect(item).toBeDefined();
        expect(item.quantity).toBe(3);
    });
});

describe("Remove from cart", () => {
    it("removes a product from the cart", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token);
        const user = await registerAndLogin();

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: product._id, quantity: 1 }).expect(200);

        const removeRes = await request(app).delete(`/api/v1/cart/${product._id}`).set("Authorization", `Bearer ${user.token}`);
        expect(removeRes.status).toBe(200);
        expect(removeRes.body.data.items.some((i: any) => i.product._id === product._id)).toBe(false);
    });
});

describe("Retrieve cart", () => {
    it("retrieves the customer's cart with all added items populated", async () => {
        const admin = await createAdminAndLogin();
        const productA = await createPublishedProduct(admin.token);
        const productB = await createPublishedProduct(admin.token);
        const user = await registerAndLogin();

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: productA._id, quantity: 1 }).expect(200);
        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: productB._id, quantity: 2 }).expect(200);

        const res = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${user.token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(2);
        expect(res.body.data.items.map((i: any) => i.product._id).sort()).toEqual([productA._id, productB._id].sort());
    });
});
