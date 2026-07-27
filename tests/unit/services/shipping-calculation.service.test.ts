import { calculateShipping } from "../../../src/services/shipping-calculation.service";
import { haversineDistanceKm } from "../../../src/utils/haversine.util";
import type { IShippingSettings } from "../../../src/models/shipping-settings.model";

const baseSettings: IShippingSettings = {
    _id: "shipping-settings",
    warehouseName: "Main Warehouse",
    warehouseAddress: "Kathmandu",
    warehouseLatitude: 27.7172,
    warehouseLongitude: 85.324,
    baseShippingCharge: 100,
    pricePerKm: 10,
    minShippingCharge: 50,
    maxShippingCharge: 500,
    freeShippingThreshold: 10000,
    weightPricingEnabled: false,
} as unknown as IShippingSettings;

describe("calculateShipping", () => {
    it("charges base + per-km distance fee, clamped between min and max", () => {
        const destLat = 27.7;
        const destLng = 85.32;
        const expectedDistance = haversineDistanceKm(baseSettings.warehouseLatitude, baseSettings.warehouseLongitude, destLat, destLng);
        const expectedFee = Math.min(
            Math.max(baseSettings.baseShippingCharge + expectedDistance * baseSettings.pricePerKm, baseSettings.minShippingCharge),
            baseSettings.maxShippingCharge
        );

        const result = calculateShipping({ destLat, destLng, subtotal: 1000, freeShippingEligible: false }, baseSettings);

        expect(result.shippingFee).toBeCloseTo(Math.round(expectedFee * 100) / 100, 2);
        expect(result.distanceKm).not.toBeNull();
    });

    it("waives the fee entirely once the subtotal reaches the free-shipping threshold", () => {
        const result = calculateShipping(
            { destLat: 27.7, destLng: 85.32, subtotal: 15000, freeShippingEligible: false },
            baseSettings
        );
        expect(result.shippingFee).toBe(0);
    });

    it("waives the fee when the cart is explicitly free-shipping eligible, regardless of subtotal", () => {
        const result = calculateShipping({ destLat: 27.7, destLng: 85.32, subtotal: 100, freeShippingEligible: true }, baseSettings);
        expect(result.shippingFee).toBe(0);
    });

    it("falls back to the flat base charge (no min/max clamp) when no destination coordinates are given", () => {
        const result = calculateShipping({ subtotal: 100, freeShippingEligible: false }, baseSettings);
        expect(result.shippingFee).toBe(baseSettings.baseShippingCharge);
        expect(result.distanceKm).toBeNull();
        expect(result.estimatedDelivery).toBe("3-5 days");
    });
});
