jest.mock("../../../src/repositories/shipping-settings.repository", () => {
    const mockShippingSettingsRepository = { getOrCreateDefault: jest.fn(), update: jest.fn() };
    return {
        ShippingSettingsMongoRepository: jest.fn().mockImplementation(() => mockShippingSettingsRepository),
        __mockShippingSettingsRepository: mockShippingSettingsRepository,
    };
});

import { ShippingSettingsService } from "../../../src/services/shipping-settings.service";
import * as ShippingSettingsRepoModule from "../../../src/repositories/shipping-settings.repository";

const mockRepo = (ShippingSettingsRepoModule as any).__mockShippingSettingsRepository;

describe("ShippingSettingsService.getSettings", () => {
    it("delegates to getOrCreateDefault so a document always exists", async () => {
        mockRepo.getOrCreateDefault.mockResolvedValue({ baseShippingCharge: 100 });
        const settings = await new ShippingSettingsService().getSettings();
        expect(settings.baseShippingCharge).toBe(100);
        expect(mockRepo.getOrCreateDefault).toHaveBeenCalled();
    });
});

describe("ShippingSettingsService.updateSettings", () => {
    it("passes the update data straight through to the repository", async () => {
        mockRepo.update.mockResolvedValue({ baseShippingCharge: 150 });
        const settings = await new ShippingSettingsService().updateSettings({ baseShippingCharge: 150 } as any);
        expect(mockRepo.update).toHaveBeenCalledWith({ baseShippingCharge: 150 });
        expect(settings.baseShippingCharge).toBe(150);
    });
});
