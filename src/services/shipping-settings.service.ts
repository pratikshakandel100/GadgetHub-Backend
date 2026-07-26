import { ShippingSettingsMongoRepository } from "../repositories/shipping-settings.repository";
import { UpdateShippingSettingsDTO } from "../dtos/shipping-settings.dto";
import { IShippingSettings } from "../models/shipping-settings.model";

const shippingSettingsRepository = new ShippingSettingsMongoRepository();

export class ShippingSettingsService {
    async getSettings(): Promise<IShippingSettings> {
        return await shippingSettingsRepository.getOrCreateDefault();
    }

    async updateSettings(data: UpdateShippingSettingsDTO): Promise<IShippingSettings> {
        return await shippingSettingsRepository.update(data);
    }
}
