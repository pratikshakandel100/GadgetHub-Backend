jest.mock("../../../src/repositories/shipping-address.repository", () => {
    const mockShippingAddressRepository = {
        getAllByUser: jest.fn(),
        getById: jest.fn(),
        countByUser: jest.fn(),
        unsetDefaultForUser: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        promoteMostRecentToDefault: jest.fn(),
    };
    return {
        ShippingAddressMongoRepository: jest.fn().mockImplementation(() => mockShippingAddressRepository),
        __mockShippingAddressRepository: mockShippingAddressRepository,
    };
});

import { ShippingAddressService } from "../../../src/services/shipping-address.service";
import * as ShippingAddressRepoModule from "../../../src/repositories/shipping-address.repository";

const mockRepo = (ShippingAddressRepoModule as any).__mockShippingAddressRepository;
const USER_ID = "u1";

describe("ShippingAddressService.getAddressById", () => {
    it("throws 404 when the address doesn't exist", async () => {
        mockRepo.getById.mockResolvedValue(null);
        await expect(new ShippingAddressService().getAddressById(USER_ID, "a1")).rejects.toThrow("Shipping address not found");
    });

    it("throws 404 when the address belongs to a different user", async () => {
        mockRepo.getById.mockResolvedValue({ user: { toString: () => "someone-else" } });
        await expect(new ShippingAddressService().getAddressById(USER_ID, "a1")).rejects.toThrow("Shipping address not found");
    });
});

describe("ShippingAddressService.createAddress", () => {
    it("makes the first address default automatically, even if isDefault wasn't requested", async () => {
        mockRepo.countByUser.mockResolvedValue(0);
        mockRepo.create.mockImplementation(async (_userId: string, data: any) => ({ _id: "a1", ...data }));

        const address = await new ShippingAddressService().createAddress(USER_ID, { isDefault: false } as any);

        expect(mockRepo.unsetDefaultForUser).toHaveBeenCalledWith(USER_ID);
        expect(address.isDefault).toBe(true);
    });

    it("does not force default for a second address unless explicitly requested", async () => {
        mockRepo.countByUser.mockResolvedValue(1);
        mockRepo.create.mockImplementation(async (_userId: string, data: any) => ({ _id: "a2", ...data }));

        const address = await new ShippingAddressService().createAddress(USER_ID, { isDefault: false } as any);

        expect(mockRepo.unsetDefaultForUser).not.toHaveBeenCalled();
        expect(address.isDefault).toBe(false);
    });
});

describe("ShippingAddressService.deleteAddress", () => {
    it("promotes another address to default when the deleted one was the default", async () => {
        mockRepo.getById.mockResolvedValue({ user: { toString: () => USER_ID }, isDefault: true });
        mockRepo.delete.mockResolvedValue(true);

        await new ShippingAddressService().deleteAddress(USER_ID, "a1");

        expect(mockRepo.promoteMostRecentToDefault).toHaveBeenCalledWith(USER_ID);
    });

    it("does not promote anything when the deleted address wasn't the default", async () => {
        mockRepo.getById.mockResolvedValue({ user: { toString: () => USER_ID }, isDefault: false });
        mockRepo.delete.mockResolvedValue(true);

        await new ShippingAddressService().deleteAddress(USER_ID, "a1");

        expect(mockRepo.promoteMostRecentToDefault).not.toHaveBeenCalled();
    });
});
