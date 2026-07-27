jest.mock("../../../src/repositories/shipping-method.repository", () => {
    const mockShippingMethodRepository = {
        findByName: jest.fn(),
        create: jest.fn(),
        getAll: jest.fn(),
        getActive: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
    return {
        ShippingMethodMongoRepository: jest.fn().mockImplementation(() => mockShippingMethodRepository),
        __mockShippingMethodRepository: mockShippingMethodRepository,
    };
});

import { ShippingMethodService } from "../../../src/services/shipping-method.service";
import * as ShippingMethodRepoModule from "../../../src/repositories/shipping-method.repository";

const mockRepo = (ShippingMethodRepoModule as any).__mockShippingMethodRepository;

describe("ShippingMethodService.createShippingMethod", () => {
    it("rejects a duplicate name", async () => {
        mockRepo.findByName.mockResolvedValue({ _id: "existing" });
        await expect(new ShippingMethodService().createShippingMethod({ name: "Standard" } as any)).rejects.toThrow(
            "A shipping method with this name already exists"
        );
    });

    it("creates the method when the name is unique", async () => {
        mockRepo.findByName.mockResolvedValue(null);
        mockRepo.create.mockResolvedValue({ _id: "m1", name: "Standard" });
        const method = await new ShippingMethodService().createShippingMethod({ name: "Standard" } as any);
        expect(method._id).toBe("m1");
    });
});

describe("ShippingMethodService.getShippingMethodById", () => {
    it("throws 404 when not found", async () => {
        mockRepo.getById.mockResolvedValue(null);
        await expect(new ShippingMethodService().getShippingMethodById("m1")).rejects.toThrow("Shipping method not found");
    });
});

describe("ShippingMethodService.updateShippingMethod", () => {
    it("throws 404 when the method doesn't exist", async () => {
        mockRepo.getById.mockResolvedValue(null);
        await expect(new ShippingMethodService().updateShippingMethod("m1", { name: "Express" } as any)).rejects.toThrow(
            "Shipping method not found"
        );
    });

    it("rejects renaming to a name already used by another method", async () => {
        mockRepo.getById.mockResolvedValue({ _id: "m1", name: "Standard" });
        mockRepo.findByName.mockResolvedValue({ _id: "other" });
        await expect(new ShippingMethodService().updateShippingMethod("m1", { name: "Express" } as any)).rejects.toThrow(
            "A shipping method with this name already exists"
        );
    });

    it("allows keeping the same name without re-checking uniqueness", async () => {
        mockRepo.getById.mockResolvedValue({ _id: "m1", name: "Standard" });
        mockRepo.update.mockResolvedValue({ _id: "m1", name: "Standard" });

        await new ShippingMethodService().updateShippingMethod("m1", { name: "Standard" } as any);

        expect(mockRepo.findByName).not.toHaveBeenCalled();
    });
});

describe("ShippingMethodService.deleteShippingMethod", () => {
    it("throws 404 when the method doesn't exist", async () => {
        mockRepo.getById.mockResolvedValue(null);
        await expect(new ShippingMethodService().deleteShippingMethod("m1")).rejects.toThrow("Shipping method not found");
    });
});
