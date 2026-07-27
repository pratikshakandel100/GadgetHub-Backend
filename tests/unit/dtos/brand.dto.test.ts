import { BrandSchema } from "../../../src/types/brand.type";

describe("BrandSchema", () => {
    it("accepts a valid brand and defaults status to Active", () => {
        const result = BrandSchema.safeParse({ name: "Dell" });
        expect(result.success).toBe(true);
        expect(result.success && result.data.status).toBe("Active");
    });

    it("rejects a missing name", () => {
        expect(BrandSchema.safeParse({}).success).toBe(false);
    });

    it("rejects an invalid status", () => {
        expect(BrandSchema.safeParse({ name: "Dell", status: "Hidden" }).success).toBe(false);
    });
});
