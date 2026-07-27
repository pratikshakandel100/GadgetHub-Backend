import { ProductSchema } from "../../../src/types/product.type";

const basePayload = {
    name: "Test Product",
    category: "cat1",
    brand: "brand1",
    shortDescription: "short",
    fullDescription: "full",
    costPrice: 100,
    originalPrice: 200,
    sellingPrice: 180,
};

describe("ProductSchema discount validation", () => {
    it("rejects a discount below 0%", () => {
        const result = ProductSchema.safeParse({ ...basePayload, discount: -5 });
        expect(result.success).toBe(false);
    });

    it("rejects a discount above 100%", () => {
        const result = ProductSchema.safeParse({ ...basePayload, discount: 150 });
        expect(result.success).toBe(false);
    });

    it("accepts discounts at the 0% and 100% boundaries", () => {
        expect(ProductSchema.safeParse({ ...basePayload, discount: 0 }).success).toBe(true);
        expect(ProductSchema.safeParse({ ...basePayload, discount: 100 }).success).toBe(true);
    });
});

describe("ProductSchema price validation", () => {
    it("rejects an original price or selling price that isn't positive", () => {
        expect(ProductSchema.safeParse({ ...basePayload, originalPrice: 0 }).success).toBe(false);
        expect(ProductSchema.safeParse({ ...basePayload, sellingPrice: -10 }).success).toBe(false);
    });
});
