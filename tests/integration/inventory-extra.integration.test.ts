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

describe("Adjust stock flow", () => {
    it("applies a negative adjustment and records the reason", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 10 });

        const res = await request(app)
            .patch(`/api/v1/inventory/${product._id}/adjust`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ delta: -3, reason: "Damaged" })
            .expect(200);

        expect(res.body.data.stockQuantity).toBe(7);
    });

    it("rejects reducing stock below zero", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 2 });

        const res = await request(app)
            .patch(`/api/v1/inventory/${product._id}/adjust`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ delta: -5, reason: "Damaged" });

        expect(res.status).toBe(400);
    });

    it("rejects an adjustment reason outside the allowed list", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 10 });

        const res = await request(app)
            .patch(`/api/v1/inventory/${product._id}/adjust`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ delta: -1, reason: "Because I said so" });

        expect(res.status).toBe(400);
    });
});

describe("Stock history flow", () => {
    it("records a movement entry for a restock", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 10 });

        await request(app)
            .patch(`/api/v1/inventory/${product._id}/restock`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ quantity: 5 })
            .expect(200);

        const historyRes = await request(app)
            .get(`/api/v1/inventory/${product._id}/history`)
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(historyRes.body.data.length).toBeGreaterThanOrEqual(1);
        expect(historyRes.body.data[0].type).toBe("restock");
        expect(historyRes.body.data[0].quantityDelta).toBe(5);
    });
});
