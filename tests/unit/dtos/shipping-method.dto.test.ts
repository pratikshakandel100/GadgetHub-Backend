import { ShippingMethodSchema, UpdateShippingMethodSchema } from "../../../src/types/shipping-method.type";

describe("ShippingMethodSchema", () => {
    it("accepts a valid shipping method and defaults isActive/sortOrder", () => {
        const result = ShippingMethodSchema.safeParse({
            name: "Standard",
            charge: 100,
            estimatedDelivery: "3-5 days",
        });
        expect(result.success).toBe(true);
        expect(result.success && result.data.isActive).toBe(true);
        expect(result.success && result.data.sortOrder).toBe(0);
    });

    it("rejects a negative charge", () => {
        expect(
            ShippingMethodSchema.safeParse({ name: "Standard", charge: -10, estimatedDelivery: "3-5 days" }).success
        ).toBe(false);
    });

    it("rejects a missing estimatedDelivery", () => {
        expect(ShippingMethodSchema.safeParse({ name: "Standard", charge: 100 }).success).toBe(false);
    });
});

describe("UpdateShippingMethodSchema", () => {
    it("allows a partial update with just one field", () => {
        expect(UpdateShippingMethodSchema.safeParse({ charge: 150 }).success).toBe(true);
    });

    it("still rejects an invalid value for a provided field", () => {
        expect(UpdateShippingMethodSchema.safeParse({ charge: -1 }).success).toBe(false);
    });
});
