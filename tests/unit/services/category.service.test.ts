jest.mock("../../../src/repositories/category.repository", () => {
    const mockCategoryRepository = {
        findByName: jest.fn(),
        findBySlug: jest.fn(),
        create: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        countProducts: jest.fn(),
        updateAttributeSchema: jest.fn(),
    };
    return {
        CategoryMongoRepository: jest.fn().mockImplementation(() => mockCategoryRepository),
        __mockCategoryRepository: mockCategoryRepository,
    };
});

jest.mock("../../../src/repositories/subcategory.repository", () => {
    const mockSubcategoryRepository = { countByCategory: jest.fn() };
    return {
        SubcategoryMongoRepository: jest.fn().mockImplementation(() => mockSubcategoryRepository),
        __mockSubcategoryRepository: mockSubcategoryRepository,
    };
});

import { CategoryService } from "../../../src/services/category.service";
import * as CategoryRepoModule from "../../../src/repositories/category.repository";
import * as SubcategoryRepoModule from "../../../src/repositories/subcategory.repository";

const mockCategoryRepository = (CategoryRepoModule as any).__mockCategoryRepository;
const mockSubcategoryRepository = (SubcategoryRepoModule as any).__mockSubcategoryRepository;

describe("CategoryService.createCategory", () => {
    it("rejects a duplicate category name", async () => {
        mockCategoryRepository.findByName.mockResolvedValue({ _id: "existing" });
        await expect(new CategoryService().createCategory({ name: "Laptops" } as any)).rejects.toThrow(
            "Category name already exists"
        );
    });

    it("slugifies the category name on create", async () => {
        mockCategoryRepository.findByName.mockResolvedValue(null);
        mockCategoryRepository.findBySlug.mockResolvedValue(null);
        mockCategoryRepository.create.mockImplementation(async (data: any) => data);

        const category = await new CategoryService().createCategory({ name: "Gaming Laptops" } as any);

        expect(category.slug).toBe("gaming-laptops");
    });
});

describe("CategoryService.updateCategoryAttributes", () => {
    it("throws 404 when the category doesn't exist", async () => {
        mockCategoryRepository.getById.mockResolvedValue(null);
        await expect(new CategoryService().updateCategoryAttributes("c1", [])).rejects.toThrow("Category not found");
    });

    it("rejects a duplicate attribute key", async () => {
        mockCategoryRepository.getById.mockResolvedValue({ _id: "c1" });
        const attrs = [
            { key: "ram", label: "RAM", type: "text", options: [], required: false },
            { key: "RAM", label: "Memory", type: "text", options: [], required: false },
        ] as any;

        await expect(new CategoryService().updateCategoryAttributes("c1", attrs)).rejects.toThrow('Duplicate attribute key: "ram"');
    });

    it("rejects a select-type attribute with no options", async () => {
        mockCategoryRepository.getById.mockResolvedValue({ _id: "c1" });
        const attrs = [{ key: "color", label: "Color", type: "select", options: [], required: false }] as any;

        await expect(new CategoryService().updateCategoryAttributes("c1", attrs)).rejects.toThrow(
            'Attribute "Color" is type "select" but has no options'
        );
    });

    it("saves a valid attribute schema", async () => {
        mockCategoryRepository.getById.mockResolvedValue({ _id: "c1" });
        mockCategoryRepository.updateAttributeSchema.mockResolvedValue({ _id: "c1", attributeSchema: [] });
        const attrs = [{ key: "ram", label: "RAM", type: "select", options: ["8GB", "16GB"], required: true }] as any;

        await expect(new CategoryService().updateCategoryAttributes("c1", attrs)).resolves.toBeDefined();
    });
});

describe("CategoryService.deleteCategory", () => {
    it("refuses to delete a category with existing products", async () => {
        mockCategoryRepository.getById.mockResolvedValue({ _id: "c1" });
        mockCategoryRepository.countProducts.mockResolvedValue(2);
        await expect(new CategoryService().deleteCategory("c1")).rejects.toThrow("Cannot delete category with existing products");
    });

    it("refuses to delete a category with existing subcategories", async () => {
        mockCategoryRepository.getById.mockResolvedValue({ _id: "c1" });
        mockCategoryRepository.countProducts.mockResolvedValue(0);
        mockSubcategoryRepository.countByCategory.mockResolvedValue(1);
        await expect(new CategoryService().deleteCategory("c1")).rejects.toThrow(
            "Cannot delete category with existing subcategories"
        );
    });

    it("deletes a category with no products or subcategories", async () => {
        mockCategoryRepository.getById.mockResolvedValue({ _id: "c1" });
        mockCategoryRepository.countProducts.mockResolvedValue(0);
        mockSubcategoryRepository.countByCategory.mockResolvedValue(0);
        mockCategoryRepository.delete.mockResolvedValue(true);
        await expect(new CategoryService().deleteCategory("c1")).resolves.toBeUndefined();
    });
});
