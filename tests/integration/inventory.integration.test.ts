import request from "supertest";
import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
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

describe("Restock flow", () => {
    it("increases stock and is reflected in the inventory list", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });

        const restockRes = await request(app)
            .patch(`/api/v1/inventory/${product._id}/restock`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ quantity: 10 })
            .expect(200);

        expect(restockRes.body.data.stockQuantity).toBe(15);

        const listRes = await request(app)
            .get("/api/v1/inventory")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        const listed = listRes.body.data.find((p: any) => p._id === product._id);
        expect(listed.stockQuantity).toBe(15);
    });

    it("rejects a non-positive restock quantity", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5 });

        const res = await request(app)
            .patch(`/api/v1/inventory/${product._id}/restock`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ quantity: 0 });

        expect(res.status).toBe(400);
    });
});

describe("Inventory summary flow", () => {
    it("counts an out-of-stock product in the summary", async () => {
        const admin = await createAdminAndLogin();
        await createPublishedProduct(admin.token, { stockQuantity: 0 });

        const res = await request(app)
            .get("/api/v1/inventory/summary")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(res.body.data.totalProducts).toBe(1);
        expect(res.body.data.outOfStock).toBe(1);
        expect(res.body.data.inStock).toBe(0);
    });
});
