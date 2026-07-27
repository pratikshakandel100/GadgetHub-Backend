jest.mock("../../../src/repositories/subcategory.repository", () => {
    const mockSubcategoryRepository = {
        findByNameInCategory: jest.fn(),
        findBySlug: jest.fn(),
        create: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        countProducts: jest.fn(),
    };
    return {
        SubcategoryMongoRepository: jest.fn().mockImplementation(() => mockSubcategoryRepository),
        __mockSubcategoryRepository: mockSubcategoryRepository,
    };
});

jest.mock("../../../src/repositories/category.repository", () => {
    const mockCategoryRepository = { getById: jest.fn() };
    return {
        CategoryMongoRepository: jest.fn().mockImplementation(() => mockCategoryRepository),
        __mockCategoryRepository: mockCategoryRepository,
    };
});

import { SubcategoryService } from "../../../src/services/subcategory.service";
import * as SubcategoryRepoModule from "../../../src/repositories/subcategory.repository";
import * as CategoryRepoModule from "../../../src/repositories/category.repository";

const mockSubRepo = (SubcategoryRepoModule as any).__mockSubcategoryRepository;
const mockCategoryRepo = (CategoryRepoModule as any).__mockCategoryRepository;

describe("SubcategoryService.createSubcategory", () => {
    it("rejects when the parent category doesn't exist", async () => {
        mockCategoryRepo.getById.mockResolvedValue(null);
        await expect(new SubcategoryService().createSubcategory({ name: "Gaming", category: "c1" } as any)).rejects.toThrow(
            "Category not found"
        );
    });

    it("rejects a duplicate name within the same category", async () => {
        mockCategoryRepo.getById.mockResolvedValue({ _id: "c1" });
        mockSubRepo.findByNameInCategory.mockResolvedValue({ _id: "existing" });
        await expect(new SubcategoryService().createSubcategory({ name: "Gaming", category: "c1" } as any)).rejects.toThrow(
            "Subcategory name already exists in this category"
        );
    });

    it("creates the subcategory with a slugified name", async () => {
        mockCategoryRepo.getById.mockResolvedValue({ _id: "c1" });
        mockSubRepo.findByNameInCategory.mockResolvedValue(null);
        mockSubRepo.findBySlug.mockResolvedValue(null);
        mockSubRepo.create.mockImplementation(async (data: any) => data);

        const subcategory = await new SubcategoryService().createSubcategory({ name: "Gaming Laptops", category: "c1" } as any);

        expect(subcategory.slug).toBe("gaming-laptops");
    });
});

describe("SubcategoryService.updateSubcategory", () => {
    it("throws 404 when the subcategory doesn't exist", async () => {
        mockSubRepo.getById.mockResolvedValue(null);
        await expect(new SubcategoryService().updateSubcategory("s1", { name: "New" } as any)).rejects.toThrow(
            "Subcategory not found"
        );
    });

    it("rejects moving to a category that doesn't exist", async () => {
        mockSubRepo.getById.mockResolvedValue({ _id: "s1", name: "Gaming", category: { toString: () => "c1" } });
        mockCategoryRepo.getById.mockResolvedValue(null);
        await expect(new SubcategoryService().updateSubcategory("s1", { category: "c2" } as any)).rejects.toThrow(
            "Category not found"
        );
    });

    it("allows a duplicate name check to pass when it's the same record being updated", async () => {
        mockSubRepo.getById.mockResolvedValue({ _id: "s1", name: "Gaming", category: { toString: () => "c1" } });
        mockSubRepo.findByNameInCategory.mockResolvedValue({ _id: "s1" });
        mockSubRepo.update.mockResolvedValue({ _id: "s1", name: "Gaming Laptops" });

        await expect(new SubcategoryService().updateSubcategory("s1", { name: "Gaming Laptops" } as any)).resolves.toBeDefined();
    });
});

describe("SubcategoryService.deleteSubcategory", () => {
    it("refuses to delete a subcategory with existing products", async () => {
        mockSubRepo.getById.mockResolvedValue({ _id: "s1" });
        mockSubRepo.countProducts.mockResolvedValue(1);
        await expect(new SubcategoryService().deleteSubcategory("s1")).rejects.toThrow(
            "Cannot delete subcategory with existing products"
        );
    });
});
