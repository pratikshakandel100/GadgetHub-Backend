// product.service.ts transitively imports product-search.service.ts, which imports the
// ESM-only "meilisearch" package that Jest's CommonJS transform can't parse. AiChatService
// only needs ProductService for its type shape here (we're testing pure parsing helpers
// that never touch it), so it's mocked out to keep this file's import graph CJS-safe.
jest.mock("../../../src/services/product.service", () => ({ ProductService: jest.fn() }));

import { AiChatService } from "../../../src/services/ai.service";

// extractBudget/extractKeywords are private parsing steps the chat assistant
// uses to narrow the product catalog before building its prompt — accessed
// via `as any` since TypeScript's `private` is compile-time only.
const service = new AiChatService() as any;

describe("AiChatService.extractBudget", () => {
    it("extracts a numeric budget from phrases like 'under Rs 50,000'", () => {
        expect(service.extractBudget("I need a laptop under Rs 50,000")).toBe(50000);
    });

    it("returns undefined when the message has no budget figure", () => {
        expect(service.extractBudget("I need a good gaming laptop")).toBeUndefined();
    });
});

describe("AiChatService.extractKeywords", () => {
    it("strips stopwords, punctuation, and de-duplicates the remaining keywords", () => {
        const keywords = service.extractKeywords("I need the best gaming laptop for gaming under 50000");
        expect(keywords).toEqual(expect.arrayContaining(["gaming", "laptop"]));
        expect(keywords).not.toContain("need");
        expect(keywords).not.toContain("the");
        expect(keywords.filter((k: string) => k === "gaming")).toHaveLength(1);
    });

    it("ignores purely numeric tokens and words that are too short", () => {
        const keywords = service.extractKeywords("I want a tv under 50000 or ok");
        expect(keywords).not.toContain("50000");
        expect(keywords).not.toContain("tv");
        expect(keywords).not.toContain("ok");
    });
});
