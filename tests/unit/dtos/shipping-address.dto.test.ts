import { ShippingAddressSchema } from "../../../src/types/shipping-address.type";

const basePayload = {
    fullName: "Pratiksha Kandel",
    phoneNumber: "9800000000",
    province: "Bagmati",
    district: "Kathmandu",
    municipality: "Kathmandu Metropolitan City",
    wardNumber: 5,
    street: "Baneshwor",
};

describe("ShippingAddressSchema", () => {
    it("accepts a valid address and defaults addressType to Home", () => {
        const result = ShippingAddressSchema.safeParse(basePayload);
        expect(result.success).toBe(true);
        expect(result.success && result.data.addressType).toBe("Home");
        expect(result.success && result.data.isDefault).toBe(false);
    });

    it("rejects a phone number that doesn't start with 9 or isn't 10 digits", () => {
        expect(ShippingAddressSchema.safeParse({ ...basePayload, phoneNumber: "8800000000" }).success).toBe(false);
        expect(ShippingAddressSchema.safeParse({ ...basePayload, phoneNumber: "98000000" }).success).toBe(false);
    });

    it("rejects an invalid province", () => {
        expect(ShippingAddressSchema.safeParse({ ...basePayload, province: "Kathmandu" }).success).toBe(false);
    });

    it("rejects a ward number below 1", () => {
        expect(ShippingAddressSchema.safeParse({ ...basePayload, wardNumber: 0 }).success).toBe(false);
    });

    it("rejects latitude/longitude outside valid ranges", () => {
        expect(ShippingAddressSchema.safeParse({ ...basePayload, latitude: 200 }).success).toBe(false);
        expect(ShippingAddressSchema.safeParse({ ...basePayload, longitude: -200 }).success).toBe(false);
    });

    it("treats an empty-string coordinate as omitted rather than invalid", () => {
        const result = ShippingAddressSchema.safeParse({ ...basePayload, latitude: "" as any });
        expect(result.success).toBe(true);
        expect(result.success && result.data.latitude).toBeUndefined();
    });
});
