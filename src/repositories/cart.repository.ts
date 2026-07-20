import Cart, { ICart } from "../models/cart.model";

export interface ICartRepository {
    findByUser(userId: string): Promise<ICart | null>;
    createForUser(userId: string): Promise<ICart>;
    addOrUpdateItem(userId: string, productId: string, quantity: number): Promise<ICart | null>;
    updateItemQuantity(userId: string, productId: string, quantity: number): Promise<ICart | null>;
    removeItem(userId: string, productId: string): Promise<ICart | null>;
    clear(userId: string): Promise<ICart | null>;
}

const POPULATE_FIELDS = {
    path: "items.product",
    select: "name sku sellingPrice originalPrice mainImage stockQuantity availability status"
};

export class CartMongoRepository implements ICartRepository {
    async findByUser(userId: string): Promise<ICart | null> {
        return await Cart.findOne({ user: userId }).populate(POPULATE_FIELDS);
    }

    async createForUser(userId: string): Promise<ICart> {
        const created = await Cart.create({ user: userId, items: [] });
        return created;
    }

    async addOrUpdateItem(userId: string, productId: string, quantity: number): Promise<ICart | null> {
        const cart = await Cart.findOneAndUpdate(
            { user: userId, "items.product": productId },
            { $inc: { "items.$.quantity": quantity } },
            { new: true }
        ).populate(POPULATE_FIELDS);

        if (cart) return cart;

        return await Cart.findOneAndUpdate(
            { user: userId },
            { $push: { items: { product: productId, quantity } } },
            { new: true, upsert: true }
        ).populate(POPULATE_FIELDS);
    }

    async updateItemQuantity(userId: string, productId: string, quantity: number): Promise<ICart | null> {
        return await Cart.findOneAndUpdate(
            { user: userId, "items.product": productId },
            { $set: { "items.$.quantity": quantity } },
            { new: true }
        ).populate(POPULATE_FIELDS);
    }

    async removeItem(userId: string, productId: string): Promise<ICart | null> {
        return await Cart.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { product: productId } } },
            { new: true }
        ).populate(POPULATE_FIELDS);
    }

    async clear(userId: string): Promise<ICart | null> {
        return await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true, upsert: true }
        ).populate(POPULATE_FIELDS);
    }
}
