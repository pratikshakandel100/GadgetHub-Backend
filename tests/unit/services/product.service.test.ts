jest.mock("../../../src/repositories/product.repository", () => {
    const mockProductRepository = {
        getByVariantKey: jest.fn(),
        incrementStock: jest.fn(),
        create: jest.fn(),
        getById: jest.fn(),
        getByCode: jest.fn(),
        incrementViewCount: jest.fn().mockResolvedValue(undefined),
        update: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
        bulkDelete: jest.fn(),
        findByNames: jest.fn(),
        getAll: jest.fn(),
        getPublished: jest.fn(),
    };
    return {
        ProductMongoRepository: jest.fn().mockImplementation(() => mockProductRepository),
        __mockProductRepository: mockProductRepository,
    };
});

jest.mock("../../../src/repositories/category.repository", () => {
    const mockCategoryRepository = { getById: jest.fn() };
    return {
        CategoryMongoRepository: jest.fn().mockImplementation(() => mockCategoryRepository),
        __mockCategoryRepository: mockCategoryRepository,
    };
});

jest.mock("../../../src/repositories/subcategory.repository", () => {
    const mockSubcategoryRepository = { getById: jest.fn() };
    return {
        SubcategoryMongoRepository: jest.fn().mockImplementation(() => mockSubcategoryRepository),
        __mockSubcategoryRepository: mockSubcategoryRepository,
    };
});

jest.mock("../../../src/repositories/brand.repository", () => {
    const mockBrandRepository = { getById: jest.fn() };
    return {
        BrandMongoRepository: jest.fn().mockImplementation(() => mockBrandRepository),
        __mockBrandRepository: mockBrandRepository,
    };
});

jest.mock("../../../src/repositories/counter.repository", () => {
    const mockCounterRepository = { getNextSequence: jest.fn().mockResolvedValue(1) };
    return {
        CounterMongoRepository: jest.fn().mockImplementation(() => mockCounterRepository),
        __mockCounterRepository: mockCounterRepository,
    };
});

jest.mock("../../../src/repositories/review.repository", () => {
    const mockReviewRepository = { getRatingSummaryByProductIds: jest.fn().mockResolvedValue({}) };
    return {
        ReviewMongoRepository: jest.fn().mockImplementation(() => mockReviewRepository),
        __mockReviewRepository: mockReviewRepository,
    };
});

jest.mock("../../../src/services/product-search.service", () => {
    const mockProductSearchService = {
        upsert: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
        enabled: false,
    };
    return {
        ProductSearchService: jest.fn().mockImplementation(() => mockProductSearchService),
        __mockProductSearchService: mockProductSearchService,
    };
});

import { ProductService } from "../../../src/services/product.service";
import * as ProductRepoModule from "../../../src/repositories/product.repository";
import * as CategoryRepoModule from "../../../src/repositories/category.repository";
import * as SubcategoryRepoModule from "../../../src/repositories/subcategory.repository";
import * as BrandRepoModule from "../../../src/repositories/brand.repository";

const mockProductRepository = (ProductRepoModule as any).__mockProductRepository;
const mockCategoryRepository = (CategoryRepoModule as any).__mockCategoryRepository;
const mockSubcategoryRepository = (SubcategoryRepoModule as any).__mockSubcategoryRepository;
const mockBrandRepository = (BrandRepoModule as any).__mockBrandRepository;

const CATEGORY = { _id: "c1", name: "Laptops", attributeSchema: [] };
const BRAND = { _id: "b1", name: "Dell" };
const basePayload = {
    name: "XPS 13",
    category: "c1",
    brand: "b1",
    attributes: {},
    stockQuantity: 10,
    variantAttributes: [],
};

describe("ProductService.createProduct", () => {
    beforeEach(() => {
        mockCategoryRepository.getById.mockResolvedValue(CATEGORY);
        mockBrandRepository.getById.mockResolvedValue(BRAND);
        mockProductRepository.getByVariantKey.mockResolvedValue(null);
        mockProductRepository.create.mockImplementation(async (data: any) => ({ _id: "p1", ...data }));
    });

    it("throws 404 when the category doesn't exist", async () => {
        mockCategoryRepository.getById.mockResolvedValue(null);
        await expect(new ProductService().createProduct(basePayload as any, "seller1")).rejects.toThrow("Category not found");
    });

    it("throws 404 when the brand doesn't exist", async () => {
        mockBrandRepository.getById.mockResolvedValue(null);
        await expect(new ProductService().createProduct(basePayload as any, "seller1")).rejects.toThrow("Brand not found");
    });

    it("rejects a subcategory that doesn't belong to the selected category", async () => {
        mockSubcategoryRepository.getById.mockResolvedValue({ category: { _id: { toString: () => "different-category" } } });
        await expect(
            new ProductService().createProduct({ ...basePayload, subcategory: "s1" } as any, "seller1")
        ).rejects.toThrow("Subcategory does not belong to the selected category");
    });

    it("requires a value for a required category attribute", async () => {
        mockCategoryRepository.getById.mockResolvedValue({
            ...CATEGORY,
            attributeSchema: [{ key: "ram", label: "RAM", type: "text", required: true, options: [] }],
        });
        await expect(new ProductService().createProduct(basePayload as any, "seller1")).rejects.toThrow(
            'Missing required attribute: "RAM"'
        );
    });

    it("rejects a select-attribute value outside its allowed options", async () => {
        mockCategoryRepository.getById.mockResolvedValue({
            ...CATEGORY,
            attributeSchema: [{ key: "color", label: "Color", type: "select", required: false, options: ["Black", "Silver"] }],
        });
        await expect(
            new ProductService().createProduct({ ...basePayload, attributes: { color: "Red" } } as any, "seller1")
        ).rejects.toThrow('Invalid value for "Color": must be one of Black, Silver');
    });

    it("restocks an existing identical variant instead of creating a duplicate", async () => {
        mockProductRepository.getByVariantKey.mockResolvedValue({ _id: "existing-p1" });
        mockProductRepository.incrementStock.mockResolvedValue({ _id: "existing-p1", stockQuantity: 20 });

        const result = await new ProductService().createProduct(basePayload as any, "seller1");

        expect(mockProductRepository.incrementStock).toHaveBeenCalledWith("existing-p1", 10);
        expect(mockProductRepository.create).not.toHaveBeenCalled();
        expect(result.created).toBe(false);
    });

    it("creates a brand-new product with a generated sku, slug and product code", async () => {
        const result = await new ProductService().createProduct(basePayload as any, "seller1");

        expect(result.created).toBe(true);
        expect(result.product.slug).toBe("xps-13");
        expect(result.product.sku).toBeDefined();
        expect(result.product.productCode).toMatch(/^GH\d{6}$/);
    });

    it("falls back to restocking the race winner on a concurrent duplicate-variant insert", async () => {
        mockProductRepository.create.mockRejectedValue({ code: 11000, keyPattern: { variantKey: 1 } });
        mockProductRepository.getByVariantKey
            .mockResolvedValueOnce(null) // first check before insert
            .mockResolvedValueOnce({ _id: "race-winner" }); // re-check after the unique-index conflict
        mockProductRepository.incrementStock.mockResolvedValue({ _id: "race-winner", stockQuantity: 20 });

        const result = await new ProductService().createProduct(basePayload as any, "seller1");

        expect(result.created).toBe(false);
        expect(mockProductRepository.incrementStock).toHaveBeenCalledWith("race-winner", 10);
    });
});

describe("ProductService.getPublishedProductById", () => {
    it("throws 404 for a product that exists but isn't published", async () => {
        mockProductRepository.getById.mockResolvedValue({ _id: "p1", status: "Draft" });
        await expect(new ProductService().getPublishedProductById("507f1f77bcf86cd799439011")).rejects.toThrow(
            "Product not found"
        );
    });

    it("returns a published product and fires a best-effort view-count increment", async () => {
        mockProductRepository.getById.mockResolvedValue({ _id: { toString: () => "p1" }, status: "Published" });

        const product = await new ProductService().getPublishedProductById("507f1f77bcf86cd799439011");

        expect(product.status).toBe("Published");
        expect(mockProductRepository.incrementViewCount).toHaveBeenCalledWith("p1");
    });

    it("looks up by product code when the id isn't a valid ObjectId", async () => {
        mockProductRepository.getByCode.mockResolvedValue({ _id: { toString: () => "p1" }, status: "Published" });

        await new ProductService().getPublishedProductById("GH000001");

        expect(mockProductRepository.getByCode).toHaveBeenCalledWith("GH000001");
        expect(mockProductRepository.getById).not.toHaveBeenCalled();
    });
});

describe("ProductService.updateProduct", () => {
    it("throws 404 when the product doesn't exist", async () => {
        mockProductRepository.getById.mockResolvedValue(null);
        await expect(new ProductService().updateProduct("p1", {} as any)).rejects.toThrow("Product not found");
    });

    it("rejects updating to a category that doesn't exist", async () => {
        mockProductRepository.getById.mockResolvedValue({ _id: "p1", category: { _id: { toString: () => "c1" } } });
        mockCategoryRepository.getById.mockResolvedValue(null);
        await expect(new ProductService().updateProduct("p1", { category: "bad-category" } as any)).rejects.toThrow(
            "Category not found"
        );
    });
});

describe("ProductService.bulkDeleteProducts", () => {
    it("separates valid ObjectIds from names, resolving names via a lookup", async () => {
        mockProductRepository.findByNames.mockResolvedValue([{ _id: "p2", name: "Found Product" }]);
        mockProductRepository.bulkDelete.mockResolvedValue(2);

        const result = await new ProductService().bulkDeleteProducts(
            ["507f1f77bcf86cd799439011"],
            ["Found Product", "Missing Product"]
        );

        expect(result.deletedCount).toBe(2);
        expect(result.notFound).toEqual(["Missing Product"]);
    });

    it("treats a malformed id string as not found rather than passing it to the DB", async () => {
        mockProductRepository.findByNames.mockResolvedValue([]);
        mockProductRepository.bulkDelete.mockResolvedValue(0);

        const result = await new ProductService().bulkDeleteProducts(["not-a-valid-id"], []);

        expect(result.notFound).toEqual(["not-a-valid-id"]);
    });
});

describe("ProductService.deleteProduct", () => {
    it("throws 404 when the product doesn't exist", async () => {
        mockProductRepository.getById.mockResolvedValue(null);
        await expect(new ProductService().deleteProduct("p1")).rejects.toThrow("Product not found");
    });
});
