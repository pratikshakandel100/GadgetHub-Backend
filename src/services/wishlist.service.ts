import { WishlistMongoRepository } from "../repositories/wishlist.repository";
import { ProductMongoRepository } from "../repositories/product.repository";
import { IWishlist } from "../models/wishlist.model";
import { HttpException } from "../exceptions/http-exception";

const wishlistRepository = new WishlistMongoRepository();
const productRepository = new ProductMongoRepository();

export class WishlistService {
    async getWishlist(userId: string): Promise<IWishlist> {
        const wishlist = await wishlistRepository.findByUser(userId);
        if (wishlist) return wishlist;
        return await wishlistRepository.createForUser(userId);
    }

    async addToWishlist(userId: string, productId: string): Promise<IWishlist> {
        const product = await productRepository.getById(productId);
        if (!product) {
            throw new HttpException(404, "Product not found");
        }

        const wishlist = await wishlistRepository.addProduct(userId, productId);
        if (!wishlist) {
            throw new HttpException(500, "Failed to add product to wishlist");
        }
        return wishlist;
    }

    async removeFromWishlist(userId: string, productId: string): Promise<IWishlist> {
        const wishlist = await wishlistRepository.removeProduct(userId, productId);
        if (!wishlist) {
            throw new HttpException(404, "Wishlist not found");
        }
        return wishlist;
    }
}
