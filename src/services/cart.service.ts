import { CartMongoRepository } from "../repositories/cart.repository";
import { ProductMongoRepository } from "../repositories/product.repository";
import { ICart } from "../models/cart.model";
import { HttpException } from "../exceptions/http-exception";

const cartRepository = new CartMongoRepository();
const productRepository = new ProductMongoRepository();

export class CartService {
    async getCart(userId: string): Promise<ICart> {
        const cart = await cartRepository.findByUser(userId);
        if (cart) return cart;
        return await cartRepository.createForUser(userId);
    }

    async addToCart(userId: string, productId: string, quantity: number): Promise<ICart> {
        const product = await productRepository.getById(productId);
        if (!product) {
            throw new HttpException(404, "Product not found");
        }
        if (product.status !== "Published") {
            throw new HttpException(400, "Product is not available for purchase");
        }
        if (product.stockQuantity < quantity) {
            throw new HttpException(400, "Insufficient stock for this product");
        }

        const cart = await cartRepository.addOrUpdateItem(userId, productId, quantity);
        if (!cart) {
            throw new HttpException(500, "Failed to add item to cart");
        }
        return cart;
    }

    async updateCartItem(userId: string, productId: string, quantity: number): Promise<ICart> {
        const product = await productRepository.getById(productId);
        if (!product) {
            throw new HttpException(404, "Product not found");
        }
        if (product.stockQuantity < quantity) {
            throw new HttpException(400, "Insufficient stock for this product");
        }

        const cart = await cartRepository.updateItemQuantity(userId, productId, quantity);
        if (!cart) {
            throw new HttpException(404, "Item not found in cart");
        }
        return cart;
    }

    async removeFromCart(userId: string, productId: string): Promise<ICart> {
        const cart = await cartRepository.removeItem(userId, productId);
        if (!cart) {
            throw new HttpException(404, "Cart not found");
        }
        return cart;
    }

    async clearCart(userId: string): Promise<ICart> {
        const cart = await cartRepository.clear(userId);
        if (!cart) {
            throw new HttpException(500, "Failed to clear cart");
        }
        return cart;
    }
}
