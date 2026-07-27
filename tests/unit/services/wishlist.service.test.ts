jest.mock("../../../src/repositories/wishlist.repository", () => {
    const mockWishlistRepository = {
        findByUser: jest.fn(),
        createForUser: jest.fn(),
        addProduct: jest.fn(),
        removeProduct: jest.fn(),
    };
    return {
        WishlistMongoRepository: jest.fn().mockImplementation(() => mockWishlistRepository),
        __mockWishlistRepository: mockWishlistRepository,
    };
});

jest.mock("../../../src/repositories/product.repository", () => {
    const mockProductRepository = { getById: jest.fn() };
    return {
        ProductMongoRepository: jest.fn().mockImplementation(() => mockProductRepository),
        __mockProductRepository: mockProductRepository,
    };
});

import { WishlistService } from "../../../src/services/wishlist.service";
import * as WishlistRepoModule from "../../../src/repositories/wishlist.repository";
import * as ProductRepoModule from "../../../src/repositories/product.repository";

const mockWishlistRepository = (WishlistRepoModule as any).__mockWishlistRepository;
const mockProductRepository = (ProductRepoModule as any).__mockProductRepository;

describe("WishlistService.getWishlist", () => {
    it("creates a wishlist for the user when none exists", async () => {
        mockWishlistRepository.findByUser.mockResolvedValue(null);
        mockWishlistRepository.createForUser.mockResolvedValue({ products: [] });

        await new WishlistService().getWishlist("u1");

        expect(mockWishlistRepository.createForUser).toHaveBeenCalledWith("u1");
    });
});

describe("WishlistService.addToWishlist", () => {
    it("rejects a product that doesn't exist", async () => {
        mockProductRepository.getById.mockResolvedValue(null);
        await expect(new WishlistService().addToWishlist("u1", "p1")).rejects.toThrow("Product not found");
    });

    it("adds the product once found", async () => {
        mockProductRepository.getById.mockResolvedValue({ _id: "p1" });
        mockWishlistRepository.addProduct.mockResolvedValue({ products: ["p1"] });

        const wishlist = await new WishlistService().addToWishlist("u1", "p1");

        expect(wishlist.products).toContain("p1");
    });
});

describe("WishlistService.removeFromWishlist", () => {
    it("throws 404 when the wishlist doesn't exist", async () => {
        mockWishlistRepository.removeProduct.mockResolvedValue(null);
        await expect(new WishlistService().removeFromWishlist("u1", "p1")).rejects.toThrow("Wishlist not found");
    });
});
