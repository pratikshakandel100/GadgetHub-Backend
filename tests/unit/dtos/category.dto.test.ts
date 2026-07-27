import { CategorySchema, CategoryAttributeSchema, UpdateCategoryAttributeSchemaPayload } from "../../../src/types/category.type";

describe("CategorySchema", () => {
    it("accepts a minimal valid category and defaults status to Active", () => {
        const result = CategorySchema.safeParse({ name: "Laptops" });
        expect(result.success).toBe(true);
        expect(result.success && result.data.status).toBe("Active");
    });

    it("rejects a missing name", () => {
        expect(CategorySchema.safeParse({}).success).toBe(false);
    });

    it("treats an empty-string optional field as undefined rather than a validation error", () => {
        const result = CategorySchema.safeParse({ name: "Laptops", slug: "", description: "" });
        expect(result.success).toBe(true);
        expect(result.success && result.data.slug).toBeUndefined();
    });

    it("rejects an invalid status", () => {
        expect(CategorySchema.safeParse({ name: "Laptops", status: "Archived" }).success).toBe(false);
    });
});

describe("CategoryAttributeSchema", () => {
    it("accepts a valid select-type attribute with options", () => {
        const result = CategoryAttributeSchema.safeParse({
            key: "ram",
            label: "RAM",
            type: "select",
            options: ["8GB", "16GB"],
        });
        expect(result.success).toBe(true);
    });

    it("defaults options to an empty array and required to false", () => {
        const result = CategoryAttributeSchema.safeParse({ key: "ram", label: "RAM", type: "text" });
        expect(result.success).toBe(true);
        expect(result.success && result.data.options).toEqual([]);
        expect(result.success && result.data.required).toBe(false);
    });

    it("rejects an invalid attribute type", () => {
        expect(CategoryAttributeSchema.safeParse({ key: "ram", label: "RAM", type: "checkbox" }).success).toBe(false);
    });
});

describe("UpdateCategoryAttributeSchemaPayload", () => {
    it("accepts an array of valid attributes", () => {
        const result = UpdateCategoryAttributeSchemaPayload.safeParse({
            attributeSchema: [{ key: "ram", label: "RAM", type: "text" }],
        });
        expect(result.success).toBe(true);
    });

    it("rejects a payload missing the attributeSchema array", () => {
        expect(UpdateCategoryAttributeSchemaPayload.safeParse({}).success).toBe(false);
    });
});
