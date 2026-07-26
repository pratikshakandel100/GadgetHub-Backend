import { haversineDistanceKm } from "../utils/haversine.util";
import { IShippingSettings } from "../models/shipping-settings.model";

export interface IShippingCalculationInput {
    destLat?: number;
    destLng?: number;
    subtotal: number;
    freeShippingEligible: boolean;
    cartWeightKg?: number;
}

export interface IShippingCalculationResult {
    distanceKm: number | null;
    shippingFee: number;
    estimatedDelivery: string;
}

const estimateDeliveryFromDistance = (distanceKm: number | null): string => {
    if (distanceKm === null) return "3-5 days";
    if (distanceKm <= 10) return "1-2 days";
    if (distanceKm <= 50) return "2-4 days";
    return "4-7 days";
};

// The single source of truth for shipping pricing — used both by the
// checkout-time quote endpoint and by order creation, so there is never a
// second implementation of this rule to drift out of sync.
export const calculateShipping = (
    input: IShippingCalculationInput,
    settings: IShippingSettings
): IShippingCalculationResult => {
    const hasCoordinates = input.destLat !== undefined && input.destLng !== undefined;

    const distanceKm = hasCoordinates
        ? haversineDistanceKm(settings.warehouseLatitude, settings.warehouseLongitude, input.destLat!, input.destLng!)
        : null;

    let fee = distanceKm === null
        ? settings.baseShippingCharge
        : settings.baseShippingCharge + distanceKm * settings.pricePerKm;

    if (distanceKm !== null) {
        fee = Math.min(Math.max(fee, settings.minShippingCharge), settings.maxShippingCharge);
    }

    if (settings.weightPricingEnabled && input.cartWeightKg && settings.weightThresholdKg !== undefined && settings.extraChargePerKg !== undefined) {
        const weightAboveThreshold = input.cartWeightKg - settings.weightThresholdKg;
        if (weightAboveThreshold > 0) {
            fee += weightAboveThreshold * settings.extraChargePerKg;
        }
    }

    const isFree = input.freeShippingEligible || (settings.freeShippingThreshold > 0 && input.subtotal >= settings.freeShippingThreshold);
    if (isFree) fee = 0;

    return {
        distanceKm: distanceKm === null ? null : Math.round(distanceKm * 100) / 100,
        shippingFee: Math.round(fee * 100) / 100,
        estimatedDelivery: estimateDeliveryFromDistance(distanceKm)
    };
};
