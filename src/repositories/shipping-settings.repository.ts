import ShippingSettings, { IShippingSettings, SHIPPING_SETTINGS_ID } from "../models/shipping-settings.model";
import { UpdateShippingSettingsDTO } from "../dtos/shipping-settings.dto";
import { stripUndefined } from "../utils/object.util";

// Defaults used only the very first time settings are read, before any admin
// has configured a real warehouse — zeroed pricing keeps shipping free (Rs.
// 0) rather than silently charging customers with made-up numbers.
const DEFAULT_SETTINGS = {
    _id: SHIPPING_SETTINGS_ID,
    warehouseName: "Main Warehouse",
    warehouseAddress: "Not configured",
    warehouseLatitude: 27.7172,
    warehouseLongitude: 85.3240,
    baseShippingCharge: 0,
    pricePerKm: 0,
    minShippingCharge: 0,
    maxShippingCharge: 0,
    freeShippingThreshold: 0,
    weightPricingEnabled: false
};

export interface IShippingSettingsRepository {
    getOrCreateDefault(): Promise<IShippingSettings>;
    update(data: UpdateShippingSettingsDTO): Promise<IShippingSettings>;
}

export class ShippingSettingsMongoRepository implements IShippingSettingsRepository {
    async getOrCreateDefault(): Promise<IShippingSettings> {
        const existing = await ShippingSettings.findById(SHIPPING_SETTINGS_ID);
        if (existing) return existing;
        return await ShippingSettings.create(DEFAULT_SETTINGS);
    }

    async update(data: UpdateShippingSettingsDTO): Promise<IShippingSettings> {
        // Never upserts here — getOrCreateDefault() is always called first
        // (by the service) to guarantee the singleton exists, so a partial
        // update can never accidentally insert a document missing required
        // fields like warehouseName.
        await this.getOrCreateDefault();
        const updated = await ShippingSettings.findByIdAndUpdate(
            SHIPPING_SETTINGS_ID,
            { $set: stripUndefined(data) },
            { new: true, runValidators: true }
        );
        return updated!;
    }
}
