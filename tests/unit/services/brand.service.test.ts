jest.mock("../../../src/repositories/brand.repository", () => {
    const mockBrandRepository = {
        findByName: jest.fn(),
        findBySlug: jest.fn(),
        create: jest.fn(),
        bulkCreate: jest.fn(),
        getAll: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        countProducts: jest.fn(),
    };
    return {
        BrandMongoRepository: jest.fn().mockImplementation(() => mockBrandRepository),
        __mockBrandRepository: mockBrandRepository,
    };
});

import { BrandService } from "../../../src/services/brand.service";
import * as BrandRepoModule from "../../../src/repositories/brand.repository";

const mockRepo = (BrandRepoModule as any).__mockBrandRepository;

describe("BrandService.createBrand", () => {
    beforeEach(() => {
        mockRepo.findByName.mockResolvedValue(null);
        mockRepo.findBySlug.mockResolvedValue(null);
        mockRepo.create.mockImplementation(async (data: any) => ({ _id: "b1", ...data }));
    });

    it("rejects a duplicate brand name", async () => {
        mockRepo.findByName.mockResolvedValue({ _id: "existing" });
        await expect(new BrandService().createBrand({ name: "Dell" } as any)).rejects.toThrow("Brand name already exists");
    });

    it("slugifies the brand name", async () => {
        const brand = await new BrandService().createBrand({ name: "Dell Inc." } as any);
        expect(brand.slug).toBe("dell-inc");
    });

    it("appends a timestamp suffix when the slug is already taken", async () => {
        mockRepo.findBySlug.mockResolvedValue({ _id: "other" });
        const brand = await new BrandService().createBrand({ name: "Dell" } as any);
        expect(brand.slug).toMatch(/^dell-[a-z0-9]+$/);
    });
});

describe("BrandService.updateBrand", () => {
    it("throws 404 when the brand doesn't exist", async () => {
        mockRepo.getById.mockResolvedValue(null);
        await expect(new BrandService().updateBrand("b1", { name: "New" } as any)).rejects.toThrow("Brand not found");
    });

    it("rejects renaming to a name that's already taken by another brand", async () => {
        mockRepo.getById.mockResolvedValue({ _id: "b1", name: "Dell" });
        mockRepo.findByName.mockResolvedValue({ _id: "other-brand" });
        await expect(new BrandService().updateBrand("b1", { name: "HP" } as any)).rejects.toThrow("Brand name already exists");
    });

    it("does not re-check the name when it isn't changing", async () => {
        mockRepo.getById.mockResolvedValue({ _id: "b1", name: "Dell" });
        mockRepo.update.mockResolvedValue({ _id: "b1", name: "Dell" });

        await new BrandService().updateBrand("b1", { name: "Dell" } as any);

        expect(mockRepo.findByName).not.toHaveBeenCalled();
    });
});

describe("BrandService.deleteBrand", () => {
    it("throws 404 when the brand doesn't exist", async () => {
        mockRepo.getById.mockResolvedValue(null);
        await expect(new BrandService().deleteBrand("b1")).rejects.toThrow("Brand not found");
    });

    it("refuses to delete a brand that still has products", async () => {
        mockRepo.getById.mockResolvedValue({ _id: "b1" });
        mockRepo.countProducts.mockResolvedValue(3);
        await expect(new BrandService().deleteBrand("b1")).rejects.toThrow("Cannot delete brand with existing products");
    });

    it("deletes a brand with zero products", async () => {
        mockRepo.getById.mockResolvedValue({ _id: "b1" });
        mockRepo.countProducts.mockResolvedValue(0);
        mockRepo.delete.mockResolvedValue(true);
        await expect(new BrandService().deleteBrand("b1")).resolves.toBeUndefined();
    });
});
