import { ShippingSettingsSchema, UpdateShippingSettingsSchema } from "../../../src/types/shipping-settings.type";

const basePayload = {
    warehouseName: "Main Warehouse",
    warehouseAddress: "Kathmandu",
    warehouseLatitude: 27.7172,
    warehouseLongitude: 85.324,
    baseShippingCharge: 100,
    pricePerKm: 10,
    minShippingCharge: 50,
    maxShippingCharge: 500,
    freeShippingThreshold: 5000,
};

describe("ShippingSettingsSchema", () => {
    it("accepts a valid settings payload", () => {
        expect(ShippingSettingsSchema.safeParse(basePayload).success).toBe(true);
    });

    it("rejects when maxShippingCharge is below minShippingCharge", () => {
        const result = ShippingSettingsSchema.safeParse({ ...basePayload, minShippingCharge: 500, maxShippingCharge: 50 });
        expect(result.success).toBe(false);
    });

    it("rejects an out-of-range warehouse latitude", () => {
        expect(ShippingSettingsSchema.safeParse({ ...basePayload, warehouseLatitude: 200 }).success).toBe(false);
    });

    it("rejects a negative base shipping charge", () => {
        expect(ShippingSettingsSchema.safeParse({ ...basePayload, baseShippingCharge: -1 }).success).toBe(false);
    });
});

describe("UpdateShippingSettingsSchema", () => {
    it("allows a partial update", () => {
        expect(UpdateShippingSettingsSchema.safeParse({ baseShippingCharge: 150 }).success).toBe(true);
    });
});
