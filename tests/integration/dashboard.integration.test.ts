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

describe("Admin dashboard summary flow", () => {
    it("reflects a newly placed order in recentOrders and today's stats", async () => {
        const admin = await createAdminAndLogin();
        const product = await createPublishedProduct(admin.token, { stockQuantity: 5, sellingPrice: 1000 });
        const user = await registerAndLogin();

        const order = await placeOrder(user.token, product._id);

        const res = await request(app)
            .get("/api/v1/admin/dashboard")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(res.body.data.recentOrders.some((o: any) => o._id === order._id)).toBe(true);
        expect(res.body.data.ordersToday).toBeGreaterThanOrEqual(1);
    });

    it("lists a low-stock product once its restock threshold is crossed downward", async () => {
        const admin = await createAdminAndLogin();
        await createPublishedProduct(admin.token, { stockQuantity: 1, minimumStockAlert: 5 });

        const res = await request(app)
            .get("/api/v1/admin/dashboard")
            .set("Authorization", `Bearer ${admin.token}`)
            .expect(200);

        expect(res.body.data.lowStockProducts.length).toBeGreaterThanOrEqual(1);
    });

    it("rejects a non-admin from viewing the dashboard", async () => {
        const user = await registerAndLogin();
        const res = await request(app).get("/api/v1/admin/dashboard").set("Authorization", `Bearer ${user.token}`);
        expect(res.status).toBe(403);
    });
});
