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

describe("AI recommendation flow", () => {
    it("finds a matching product candidate and returns the (mocked) Gemini reply", async () => {
        const admin = await createAdminAndLogin();
        await createPublishedProduct(admin.token, {
            name: "Gaming Laptop Pro",
            stockQuantity: 5,
            sellingPrice: 150000,
        });
        mockGenerateContent.mockResolvedValue({ text: "The Gaming Laptop Pro is a great pick for gaming." });

        const res = await request(app).post("/api/v1/ai/chat").send({ message: "I need a good gaming laptop" });

        expect(res.status).toBe(200);
        expect(res.body.data.reply).toBe("The Gaming Laptop Pro is a great pick for gaming.");
        expect(res.body.data.recommendedProducts.length).toBeGreaterThan(0);
        expect(res.body.data.recommendedProducts[0].name).toBe("Gaming Laptop Pro");
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
});

describe("AI graceful no-match handling", () => {
    it("returns a no-match reply without calling Gemini when nothing in the catalog matches", async () => {
        const admin = await createAdminAndLogin();
        await createPublishedProduct(admin.token, { name: "Gaming Laptop Pro", stockQuantity: 5 });

        const res = await request(app).post("/api/v1/ai/chat").send({ message: "I would like a submarine periscope" });

        expect(res.status).toBe(200);
        expect(res.body.data.reply).toMatch(/couldn't find a matching product/i);
        expect(res.body.data.recommendedProducts).toEqual([]);
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });
});
