import Wishlist, { IWishlist } from "../models/wishlist.model";

export interface IWishlistRepository {
    findByUser(userId: string): Promise<IWishlist | null>;
    createForUser(userId: string): Promise<IWishlist>;
    addProduct(userId: string, productId: string): Promise<IWishlist | null>;
    removeProduct(userId: string, productId: string): Promise<IWishlist | null>;
    hasProduct(userId: string, productId: string): Promise<boolean>;
}

const POPULATE_FIELDS = {
    path: "products",
    select: "name sku slug productCode sellingPrice originalPrice mainImage stockQuantity availability status"
};

export class WishlistMongoRepository implements IWishlistRepository {
    async findByUser(userId: string): Promise<IWishlist | null> {
        return await Wishlist.findOne({ user: userId }).populate(POPULATE_FIELDS);
    }

    async createForUser(userId: string): Promise<IWishlist> {
        return await Wishlist.create({ user: userId, products: [] });
    }

    async addProduct(userId: string, productId: string): Promise<IWishlist | null> {
        return await Wishlist.findOneAndUpdate(
            { user: userId },
            { $addToSet: { products: productId } },
            { new: true, upsert: true }
        ).populate(POPULATE_FIELDS);
    }

    async removeProduct(userId: string, productId: string): Promise<IWishlist | null> {
        return await Wishlist.findOneAndUpdate(
            { user: userId },
            { $pull: { products: productId } },
            { new: true }
        ).populate(POPULATE_FIELDS);
    }

    async hasProduct(userId: string, productId: string): Promise<boolean> {
        const found = await Wishlist.exists({ user: userId, products: productId });
        return !!found;
    }
}
