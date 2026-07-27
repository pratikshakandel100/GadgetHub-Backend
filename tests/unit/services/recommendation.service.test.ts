jest.mock("../../../src/repositories/wishlist.repository", () => {
    const mockWishlistRepository = { findByUser: jest.fn() };
    return {
        WishlistMongoRepository: jest.fn().mockImplementation(() => mockWishlistRepository),
        __mockWishlistRepository: mockWishlistRepository,
    };
});

jest.mock("../../../src/repositories/cart.repository", () => {
    const mockCartRepository = { findByUser: jest.fn() };
    return {
        CartMongoRepository: jest.fn().mockImplementation(() => mockCartRepository),
        __mockCartRepository: mockCartRepository,
    };
});

jest.mock("../../../src/repositories/order.repository", () => {
    const mockOrderRepository = { getByUser: jest.fn(), getFrequentlyCoOccurring: jest.fn() };
    return {
        OrderMongoRepository: jest.fn().mockImplementation(() => mockOrderRepository),
        __mockOrderRepository: mockOrderRepository,
    };
});

jest.mock("../../../src/repositories/product.repository", () => {
    const mockProductRepository = {
        getCategoriesByProductIds: jest.fn(),
        getRecommendedByCategories: jest.fn(),
        getPublishedByIds: jest.fn(),
    };
    return {
        ProductMongoRepository: jest.fn().mockImplementation(() => mockProductRepository),
        __mockProductRepository: mockProductRepository,
    };
});

import { RecommendationService } from "../../../src/services/recommendation.service";
import * as WishlistRepoModule from "../../../src/repositories/wishlist.repository";
import * as CartRepoModule from "../../../src/repositories/cart.repository";
import * as OrderRepoModule from "../../../src/repositories/order.repository";
import * as ProductRepoModule from "../../../src/repositories/product.repository";

const mockWishlistRepository = (WishlistRepoModule as any).__mockWishlistRepository;
const mockCartRepository = (CartRepoModule as any).__mockCartRepository;
const mockOrderRepository = (OrderRepoModule as any).__mockOrderRepository;
const mockProductRepository = (ProductRepoModule as any).__mockProductRepository;

describe("RecommendationService.getRecommendedForUser", () => {
    it("returns an empty list when the user has no wishlist, cart or order signal", async () => {
        mockWishlistRepository.findByUser.mockResolvedValue(null);
        mockCartRepository.findByUser.mockResolvedValue(null);
        mockOrderRepository.getByUser.mockResolvedValue({ orders: [] });

        const result = await new RecommendationService().getRecommendedForUser("u1");

        expect(result).toEqual([]);
        expect(mockProductRepository.getCategoriesByProductIds).not.toHaveBeenCalled();
    });

    it("ranks categories by frequency and recommends from the top ones, excluding already-seen products", async () => {
        mockWishlistRepository.findByUser.mockResolvedValue({ products: [{ _id: "p1" }] });
        mockCartRepository.findByUser.mockResolvedValue({ items: [{ product: { _id: "p2" } }] });
        mockOrderRepository.getByUser.mockResolvedValue({ orders: [] });
        mockProductRepository.getCategoriesByProductIds.mockResolvedValue([
            { category: "cat-electronics" },
            { category: "cat-electronics" },
            { category: "cat-books" },
        ]);
        mockProductRepository.getRecommendedByCategories.mockResolvedValue([{ _id: "p3" }]);

        const result = await new RecommendationService().getRecommendedForUser("u1");

        expect(mockProductRepository.getRecommendedByCategories).toHaveBeenCalledWith(
            ["cat-electronics", "cat-books"],
            expect.arrayContaining(["p1", "p2"]),
            10
        );
        expect(result).toEqual([{ _id: "p3" }]);
    });

    it("clamps an out-of-range limit into [1, 20]", async () => {
        mockWishlistRepository.findByUser.mockResolvedValue({ products: [{ _id: "p1" }] });
        mockCartRepository.findByUser.mockResolvedValue(null);
        mockOrderRepository.getByUser.mockResolvedValue({ orders: [] });
        mockProductRepository.getCategoriesByProductIds.mockResolvedValue([{ category: "cat1" }]);
        mockProductRepository.getRecommendedByCategories.mockResolvedValue([]);

        await new RecommendationService().getRecommendedForUser("u1", 500);

        expect(mockProductRepository.getRecommendedByCategories).toHaveBeenCalledWith(["cat1"], ["p1"], 20);
    });
});

describe("RecommendationService.getFrequentlyBoughtTogether", () => {
    it("returns an empty list when nothing co-occurs with this product", async () => {
        mockOrderRepository.getFrequentlyCoOccurring.mockResolvedValue([]);
        const result = await new RecommendationService().getFrequentlyBoughtTogether("p1");
        expect(result).toEqual([]);
    });

    it("re-applies co-occurrence ranking and drops ids that no longer resolve to a live product", async () => {
        mockOrderRepository.getFrequentlyCoOccurring.mockResolvedValue([
            { productId: "p1", count: 5 },
            { productId: "p2", count: 3 },
            { productId: "p3", count: 1 },
        ]);
        // p2 was deleted/unpublished since — getPublishedByIds only returns p1 and p3.
        mockProductRepository.getPublishedByIds.mockResolvedValue([
            { _id: { toString: () => "p3" } },
            { _id: { toString: () => "p1" } },
        ]);

        const result = await new RecommendationService().getFrequentlyBoughtTogether("main-product", 4);

        expect(result.map((p: any) => p._id.toString())).toEqual(["p1", "p3"]);
    });
});
