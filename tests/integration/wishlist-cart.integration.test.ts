import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { registerAndLogin } from "./setup/authHelpers";
import { createAdminAndLogin } from "./setup/authHelpers";
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

describe("Wishlist flow", () => {
    it("adds a product to the wishlist and retrieves it", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token);
        const user = await registerAndLogin();

        await request(app)
            .post("/api/v1/wishlist")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ productId: product._id })
            .expect(200);

        const wishlistRes = await request(app).get("/api/v1/wishlist").set("Authorization", `Bearer ${user.token}`);

        expect(wishlistRes.status).toBe(200);
        expect(wishlistRes.body.data.products.some((p: any) => p._id === product._id)).toBe(true);
    });
});

describe("Move product from wishlist to cart", () => {
    it("removes the product from the wishlist and adds it to the cart", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token);
        const user = await registerAndLogin();

        await request(app).post("/api/v1/wishlist").set("Authorization", `Bearer ${user.token}`).send({ productId: product._id }).expect(200);

        await request(app).delete(`/api/v1/wishlist/${product._id}`).set("Authorization", `Bearer ${user.token}`).expect(200);
        await request(app)
            .post("/api/v1/cart")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ productId: product._id, quantity: 1 })
            .expect(200);

        const wishlistRes = await request(app).get("/api/v1/wishlist").set("Authorization", `Bearer ${user.token}`);
        const cartRes = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${user.token}`);

        expect(wishlistRes.body.data.products.some((p: any) => p._id === product._id)).toBe(false);
        expect(cartRes.body.data.items.some((item: any) => item.product._id === product._id)).toBe(true);
    });
});

describe("Cart quantity update", () => {
    it("updates the cart item quantity and the recalculated subtotal reflects the new quantity", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { sellingPrice: 250 });
        const user = await registerAndLogin();

        await request(app).post("/api/v1/cart").set("Authorization", `Bearer ${user.token}`).send({ productId: product._id, quantity: 2 }).expect(200);

        const updateRes = await request(app)
            .put(`/api/v1/cart/${product._id}`)
            .set("Authorization", `Bearer ${user.token}`)
            .send({ quantity: 5 });

        expect(updateRes.status).toBe(200);
        const item = updateRes.body.data.items.find((i: any) => i.product._id === product._id);
        expect(item.quantity).toBe(5);

        const subtotal = updateRes.body.data.items.reduce((sum: number, i: any) => sum + i.product.sellingPrice * i.quantity, 0);
        expect(subtotal).toBe(250 * 5);
    });
});
