jest.mock("../../../src/repositories/cart.repository", () => {
    const mockCartRepository = {
        findByUser: jest.fn(),
        createForUser: jest.fn(),
        addOrUpdateItem: jest.fn(),
        updateItemQuantity: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
    };
    return {
        CartMongoRepository: jest.fn().mockImplementation(() => mockCartRepository),
        __mockCartRepository: mockCartRepository,
    };
});

jest.mock("../../../src/repositories/product.repository", () => {
    const mockProductRepository = { getById: jest.fn() };
    return {
        ProductMongoRepository: jest.fn().mockImplementation(() => mockProductRepository),
        __mockProductRepository: mockProductRepository,
    };
});

import { CartService } from "../../../src/services/cart.service";
import * as CartRepoModule from "../../../src/repositories/cart.repository";
import * as ProductRepoModule from "../../../src/repositories/product.repository";

const mockCartRepository = (CartRepoModule as any).__mockCartRepository;
const mockProductRepository = (ProductRepoModule as any).__mockProductRepository;

const PUBLISHED_PRODUCT = { _id: "p1", status: "Published", stockQuantity: 5 };

describe("CartService.getCart", () => {
    it("creates a new cart for the user when none exists yet", async () => {
        mockCartRepository.findByUser.mockResolvedValue(null);
        mockCartRepository.createForUser.mockResolvedValue({ items: [] });

        const cart = await new CartService().getCart("u1");

        expect(mockCartRepository.createForUser).toHaveBeenCalledWith("u1");
        expect(cart).toEqual({ items: [] });
    });

    it("returns the existing cart without creating a new one", async () => {
        mockCartRepository.findByUser.mockResolvedValue({ items: [{ productId: "p1" }] });

        await new CartService().getCart("u1");

        expect(mockCartRepository.createForUser).not.toHaveBeenCalled();
    });
});

describe("CartService.addToCart", () => {
    it("rejects a product that doesn't exist", async () => {
        mockProductRepository.getById.mockResolvedValue(null);
        await expect(new CartService().addToCart("u1", "p1", 1)).rejects.toThrow("Product not found");
    });

    it("rejects a product that isn't published", async () => {
        mockProductRepository.getById.mockResolvedValue({ ...PUBLISHED_PRODUCT, status: "Draft" });
        await expect(new CartService().addToCart("u1", "p1", 1)).rejects.toThrow("Product is not available for purchase");
    });

    it("rejects a quantity that exceeds stock", async () => {
        mockProductRepository.getById.mockResolvedValue(PUBLISHED_PRODUCT);
        await expect(new CartService().addToCart("u1", "p1", 10)).rejects.toThrow("Insufficient stock for this product");
    });

    it("adds the item once the product is valid and in stock", async () => {
        mockProductRepository.getById.mockResolvedValue(PUBLISHED_PRODUCT);
        mockCartRepository.addOrUpdateItem.mockResolvedValue({ items: [{ productId: "p1", quantity: 2 }] });

        const cart = await new CartService().addToCart("u1", "p1", 2);

        expect(mockCartRepository.addOrUpdateItem).toHaveBeenCalledWith("u1", "p1", 2);
        expect(cart.items).toHaveLength(1);
    });
});

describe("CartService.removeFromCart / clearCart", () => {
    it("throws 404 when the cart doesn't exist on removal", async () => {
        mockCartRepository.removeItem.mockResolvedValue(null);
        await expect(new CartService().removeFromCart("u1", "p1")).rejects.toThrow("Cart not found");
    });

    it("clears the cart successfully", async () => {
        mockCartRepository.clear.mockResolvedValue({ items: [] });
        const cart = await new CartService().clearCart("u1");
        expect(cart.items).toEqual([]);
    });
});
