import { WishlistMongoRepository } from "../repositories/wishlist.repository";
import { CartMongoRepository } from "../repositories/cart.repository";
import { OrderMongoRepository } from "../repositories/order.repository";
import { ProductMongoRepository } from "../repositories/product.repository";
import { IProduct } from "../models/product.model";

const wishlistRepository = new WishlistMongoRepository();
const cartRepository = new CartMongoRepository();
const orderRepository = new OrderMongoRepository();
const productRepository = new ProductMongoRepository();

const DEFAULT_RECOMMENDED_LIMIT = 10;
const MAX_RECOMMENDED_LIMIT = 20;
const TOP_CATEGORY_COUNT = 3;
const ORDER_HISTORY_LIMIT = 20;
const DEFAULT_FBT_LIMIT = 4;
const MAX_FBT_LIMIT = 8;

export class RecommendationService {
    /**
     * Personalized "Recommended For You": ranks categories by how many distinct
     * products the user has shown interest in (wishlist + cart + order history
     * combined, deduplicated — a product in both cart and wishlist counts once,
     * not twice), then recommends other Published/In Stock products from the
     * top categories, excluding anything already wishlisted, carted or bought.
     * Returns [] when there's no signal yet, rather than falling back to a
     * generic bestseller list — that would just duplicate the homepage's
     * Featured Deals section under a "personalized" label.
     */
    async getRecommendedForUser(userId: string, limit: number = DEFAULT_RECOMMENDED_LIMIT): Promise<IProduct[]> {
        const clampedLimit = Math.min(Math.max(1, limit), MAX_RECOMMENDED_LIMIT);

        const [wishlist, cart, orderResult] = await Promise.all([
            wishlistRepository.findByUser(userId),
            cartRepository.findByUser(userId),
            orderRepository.getByUser(userId, 1, ORDER_HISTORY_LIMIT, "", { createdAt: -1 })
        ]);

        const wishlistIds = (wishlist?.products ?? []).map((p: any) => (p._id ?? p).toString());
        const cartIds = (cart?.items ?? []).map((i: any) => (i.product?._id ?? i.product).toString());
        const orderIds = orderResult.orders.flatMap((o) => o.items.map((i) => i.product.toString()));

        const seenProductIds = Array.from(new Set([...wishlistIds, ...cartIds, ...orderIds]));
        if (seenProductIds.length === 0) {
            return [];
        }

        const categorized = await productRepository.getCategoriesByProductIds(seenProductIds);
        const categoryFrequency = new Map<string, number>();
        for (const { category } of categorized) {
            categoryFrequency.set(category, (categoryFrequency.get(category) ?? 0) + 1);
        }

        const topCategories = Array.from(categoryFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP_CATEGORY_COUNT)
            .map(([categoryId]) => categoryId);

        if (topCategories.length === 0) {
            return [];
        }

        return await productRepository.getRecommendedByCategories(topCategories, seenProductIds, clampedLimit);
    }

    /**
     * "Frequently Bought Together": which other products most often appear in
     * the same order as this one, across all customers' order history. Pure
     * basket co-occurrence, no personalization — same result for every viewer.
     */
    async getFrequentlyBoughtTogether(productId: string, limit: number = DEFAULT_FBT_LIMIT): Promise<IProduct[]> {
        const clampedLimit = Math.min(Math.max(1, limit), MAX_FBT_LIMIT);

        // Overfetch candidates: some co-occurring product ids may point at
        // products that were since unpublished or deleted, and those get
        // filtered out below rather than padding the final result short.
        const coOccurring = await orderRepository.getFrequentlyCoOccurring(productId, clampedLimit * 3);
        if (coOccurring.length === 0) {
            return [];
        }

        const candidateIds = coOccurring.map((c) => c.productId);
        const products = await productRepository.getPublishedByIds(candidateIds);
        const productById = new Map(products.map((p) => [p._id.toString(), p]));

        // Mongo's $in doesn't preserve order, so re-apply the co-occurrence
        // ranking here and drop ids that no longer resolve to a live product.
        return coOccurring
            .map((c) => productById.get(c.productId))
            .filter((p): p is IProduct => !!p)
            .slice(0, clampedLimit);
    }
}
