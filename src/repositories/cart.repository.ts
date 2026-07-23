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
    select: "name sku slug productCode sellingPrice originalPrice mainImage stockQuantity availability status"
};

export class CartMongoRepository implements ICartRepository {
    /**
     * A cart item's `product` populates to null when the referenced product
     * was deleted from the catalog after being added to the cart. Rather than
     * let that null reach every screen that reads `item.product.sellingPrice`,
     * prune those stale entries here — the one place all cart reads flow
     * through — and persist the removal so it doesn't keep resurfacing.
     */
    private async pruneOrphanedItems(cart: ICart | null): Promise<ICart | null> {
        if (!cart) return cart;
        const orphanedIds = cart.items.filter((item) => !item.product).map((item) => item._id);
        if (orphanedIds.length === 0) return cart;

        await Cart.updateOne({ _id: cart._id }, { $pull: { items: { _id: { $in: orphanedIds } } } });
        cart.items = cart.items.filter((item) => !!item.product);
        return cart;
    }

    async findByUser(userId: string): Promise<ICart | null> {
        const cart = await Cart.findOne({ user: userId }).populate(POPULATE_FIELDS);
        return this.pruneOrphanedItems(cart);
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

        if (cart) return this.pruneOrphanedItems(cart);

        const created = await Cart.findOneAndUpdate(
            { user: userId },
            { $push: { items: { product: productId, quantity } } },
            { new: true, upsert: true }
        ).populate(POPULATE_FIELDS);
        return this.pruneOrphanedItems(created);
    }

    async updateItemQuantity(userId: string, productId: string, quantity: number): Promise<ICart | null> {
        const cart = await Cart.findOneAndUpdate(
            { user: userId, "items.product": productId },
            { $set: { "items.$.quantity": quantity } },
            { new: true }
        ).populate(POPULATE_FIELDS);
        return this.pruneOrphanedItems(cart);
    }

    async removeItem(userId: string, productId: string): Promise<ICart | null> {
        const cart = await Cart.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { product: productId } } },
            { new: true }
        ).populate(POPULATE_FIELDS);
        return this.pruneOrphanedItems(cart);
    }

    async clear(userId: string): Promise<ICart | null> {
        return await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true, upsert: true }
        ).populate(POPULATE_FIELDS);
    }
}
