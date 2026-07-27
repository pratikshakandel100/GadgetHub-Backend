import { SubcategorySchema } from "../../../src/types/subcategory.type";

describe("SubcategorySchema", () => {
    it("accepts a valid subcategory and defaults status to Active", () => {
        const result = SubcategorySchema.safeParse({ name: "Gaming Laptops", category: "cat1" });
        expect(result.success).toBe(true);
        expect(result.success && result.data.status).toBe("Active");
    });

    it("rejects a missing category reference", () => {
        expect(SubcategorySchema.safeParse({ name: "Gaming Laptops" }).success).toBe(false);
    });

    it("rejects a missing name", () => {
        expect(SubcategorySchema.safeParse({ category: "cat1" }).success).toBe(false);
    });
});
