import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { registerAndLogin, createAdminAndLogin } from "./setup/authHelpers";
import { createPublishedProduct, createCategory } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("Personalized recommendations flow", () => {
    it("returns an empty list for a user with no wishlist, cart or order signal yet", async () => {
        const user = await registerAndLogin();

        const res = await request(app)
            .get("/api/v1/recommendations/recommended")
            .set("Authorization", `Bearer ${user.token}`)
            .expect(200);

        expect(res.body.data).toEqual([]);
    });

    it("recommends another product from the same category once the user wishlists one", async () => {
        const admin = await createAdminAndLogin();
        const category = await createCategory(admin.token);
        const wishlisted = await createPublishedProduct(admin.token, { category: category._id, name: `Wishlisted-${Date.now()}` });
        const otherInCategory = await createPublishedProduct(admin.token, { category: category._id, name: `Other-${Date.now()}` });
        const user = await registerAndLogin();

        await request(app)
            .post("/api/v1/wishlist")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ productId: wishlisted._id })
            .expect(200);

        const res = await request(app)
            .get("/api/v1/recommendations/recommended")
            .set("Authorization", `Bearer ${user.token}`)
            .expect(200);

        const recommendedIds = res.body.data.map((p: any) => p._id);
        expect(recommendedIds).toContain(otherInCategory._id);
        expect(recommendedIds).not.toContain(wishlisted._id);
    });
});
