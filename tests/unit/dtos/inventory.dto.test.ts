import { RestockSchema, AdjustStockSchema } from "../../../src/types/inventory.type";

describe("RestockSchema", () => {
    it("accepts a positive integer quantity", () => {
        expect(RestockSchema.safeParse({ quantity: 10 }).success).toBe(true);
    });

    it("rejects zero or a negative quantity", () => {
        expect(RestockSchema.safeParse({ quantity: 0 }).success).toBe(false);
        expect(RestockSchema.safeParse({ quantity: -5 }).success).toBe(false);
    });

    it("rejects a non-integer quantity", () => {
        expect(RestockSchema.safeParse({ quantity: 2.5 }).success).toBe(false);
    });
});

describe("AdjustStockSchema", () => {
    it("accepts a nonzero delta with a valid reason", () => {
        expect(AdjustStockSchema.safeParse({ delta: -3, reason: "Damaged" }).success).toBe(true);
        expect(AdjustStockSchema.safeParse({ delta: 5, reason: "Returned" }).success).toBe(true);
    });

    it("rejects a delta of exactly zero", () => {
        expect(AdjustStockSchema.safeParse({ delta: 0, reason: "Manual correction" }).success).toBe(false);
    });

    it("rejects an invalid reason", () => {
        expect(AdjustStockSchema.safeParse({ delta: 5, reason: "Because" }).success).toBe(false);
    });
});
