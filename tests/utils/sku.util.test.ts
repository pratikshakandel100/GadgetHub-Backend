import { buildSkuCodes, formatSku, pickPrimaryVariantValue, buildVariantKey } from "../../src/utils/sku.util";

describe("buildSkuCodes", () => {
    it("derives uppercase category/brand/variant codes from real names", () => {
        const codes = buildSkuCodes("Laptops", "Apple", [{ key: "Color", value: "Space Grey" }]);
        expect(codes).toEqual({ categoryCode: "LAPT", brandCode: "APP", variantCode: "SPA" });
    });

    it("falls back to GEN/BRD when category/brand names have no letters, and derives the variant code from the 'Standard' default", () => {
        const codes = buildSkuCodes("123", "456", []);
        expect(codes).toEqual({ categoryCode: "GEN", brandCode: "BRD", variantCode: "STA" });
    });
});

describe("pickPrimaryVariantValue", () => {
    it("prioritizes color over storage and any other attribute", () => {
        const value = pickPrimaryVariantValue([
            { key: "Storage", value: "256GB" },
            { key: "Color", value: "Midnight" },
        ]);
        expect(value).toBe("Midnight");
    });

    it("falls back to Standard when there are no variant attributes at all", () => {
        expect(pickPrimaryVariantValue([])).toBe("Standard");
    });
});

describe("formatSku", () => {
    it("joins the four segments and zero-pads the sequence to 4 digits", () => {
        expect(formatSku("LAPT", "APP", "SPA", 7)).toBe("LAPT-APP-SPA-0007");
    });
});

describe("buildVariantKey", () => {
    it("produces the same key regardless of the order attributes are supplied in", () => {
        const keyA = buildVariantKey("seller1", "MacBook Pro", "brand1", "cat1", [
            { key: "Color", value: "Silver" },
            { key: "Storage", value: "512GB" },
        ]);
        const keyB = buildVariantKey("seller1", "MacBook Pro", "brand1", "cat1", [
            { key: "Storage", value: "512GB" },
            { key: "Color", value: "Silver" },
        ]);
        expect(keyA).toBe(keyB);
    });
});
