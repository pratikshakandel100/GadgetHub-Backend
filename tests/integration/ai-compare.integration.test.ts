import request from "supertest";

const mockGenerateContent = jest.fn();
jest.mock("@google/genai", () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
    })),
}));

import app from "../../src/app";
import { connectTestDb, clearTestDb, closeTestDb } from "./setup/testDb";
import { createAdminAndLogin } from "./setup/authHelpers";
import { createPublishedProduct } from "./setup/dataHelpers";

beforeAll(async () => {
    await connectTestDb();
});
afterEach(async () => {
    jest.clearAllMocks();
    await clearTestDb();
});
afterAll(async () => {
    await closeTestDb();
});

describe("AI product comparison flow", () => {
    it("compares two published products and returns the (mocked) Gemini summary", async () => {
        const admin = await createAdminAndLogin();
        const productA = await createPublishedProduct(admin.token, { name: `Laptop A ${Date.now()}` });
        const productB = await createPublishedProduct(admin.token, { name: `Laptop B ${Date.now()}` });
        mockGenerateContent.mockResolvedValue({ text: "Laptop A wins on price, Laptop B wins on performance." });

        const res = await request(app)
            .post("/api/v1/ai/compare")
            .send({ productIds: [productA._id, productB._id] })
            .expect(200);

        expect(res.body.data.summary).toContain("Laptop A wins on price");
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("rejects comparing fewer than 2 products", async () => {
        const admin = await createAdminAndLogin();
        const productA = await createPublishedProduct(admin.token);

        const res = await request(app).post("/api/v1/ai/compare").send({ productIds: [productA._id] });

        expect(res.status).toBe(400);
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });
});
