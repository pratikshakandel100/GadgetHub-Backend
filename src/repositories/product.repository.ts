import { CreateProductDTO } from "../dtos/product.dto";
import Product, { IProduct } from "../models/product.model";
import { buildPaginationMeta, SortOrder } from "../utils/query.util";
import { stripUndefined } from "../utils/object.util";

export interface IProductListResult {
    products: IProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ICreateProductData extends CreateProductDTO {
    sku: string;
    variantKey: string;
    seller: string;
}

export interface IAssistantSearchParams {
    keywords: string[];
    categoryIds?: string[];
    brandIds?: string[];
    maxPrice?: number;
    limit: number;
}

export interface IProductRepository {
    create(product: ICreateProductData): Promise<IProduct>;
    bulkCreate(products: ICreateProductData[]): Promise<IProduct[]>;
    getAll(
        page: number,
        limit: number,
        search: string,
        category: string,
        status: string,
        sort: Record<string, SortOrder>,
        minPrice?: number,
        maxPrice?: number
    ): Promise<IProductListResult>;
    getPublished(
        page: number,
        limit: number,
        search: string,
        category: string,
        sort: Record<string, SortOrder>,
        minPrice?: number,
        maxPrice?: number
    ): Promise<IProductListResult>;
    getById(id: string): Promise<IProduct | null>;
    getPublishedByIds(ids: string[]): Promise<IProduct[]>;
    getSimilar(productId: string, categoryId: string, subcategoryId: string | undefined, limit: number): Promise<IProduct[]>;
    getCategoriesByProductIds(ids: string[]): Promise<{ id: string; category: string }[]>;
    getRecommendedByCategories(categoryIds: string[], excludeIds: string[], limit: number): Promise<IProduct[]>;
    getByVariantKey(variantKey: string): Promise<IProduct | null>;
    searchForAssistant(params: IAssistantSearchParams): Promise<IProduct[]>;
    update(id: string, product: Record<string, any>): Promise<IProduct | null>;
    updateStatus(id: string, status: "Draft" | "Published"): Promise<IProduct | null>;
    incrementStock(id: string, quantity: number): Promise<IProduct | null>;
    decrementStock(id: string, quantity: number): Promise<IProduct | null>;
    delete(id: string): Promise<boolean>;
    bulkDelete(ids: string[]): Promise<number>;
    findByNames(names: string[]): Promise<IProduct[]>;
    existsBySku(sku: string): Promise<boolean>;
}

const POPULATE_FIELDS = [
    { path: "category", select: "name" },
    { path: "subcategory", select: "name" },
    { path: "brand", select: "name" }
];

export class ProductMongoRepository implements IProductRepository {
    async create(product: ICreateProductData): Promise<IProduct> {
        const created = await Product.create(product);
        return created.populate(POPULATE_FIELDS);
    }

    async bulkCreate(products: ICreateProductData[]): Promise<IProduct[]> {
        if (products.length === 0) return [];
        try {
            const inserted = await Product.insertMany(products, { ordered: false });
            return await Product.populate(inserted, POPULATE_FIELDS);
        } catch (error: any) {
            if (Array.isArray(error?.insertedDocs)) {
                return await Product.populate(error.insertedDocs, POPULATE_FIELDS);
            }
            throw error;
        }
    }

    async getAll(
        page: number,
        limit: number,
        search: string,
        category: string,
        status: string,
        sort: Record<string, SortOrder>,
        minPrice?: number,
        maxPrice?: number
    ): Promise<IProductListResult> {
        const query: any = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } }
            ];
        }
        if (category) query.category = category;
        if (status) query.status = status;
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.sellingPrice = stripUndefined({ $gte: minPrice, $lte: maxPrice });
        }

        const skip = (page - 1) * limit;
        const products = await Product.find(query)
            .populate(POPULATE_FIELDS)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(query);

        return { products, ...buildPaginationMeta(total, page, limit) };
    }

    async getPublished(
        page: number,
        limit: number,
        search: string,
        category: string,
        sort: Record<string, SortOrder>,
        minPrice?: number,
        maxPrice?: number
    ): Promise<IProductListResult> {
        const query: any = { status: "Published" };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } }
            ];
        }
        if (category) query.category = category;
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.sellingPrice = stripUndefined({ $gte: minPrice, $lte: maxPrice });
        }

        const skip = (page - 1) * limit;
        const products = await Product.find(query)
            .populate(POPULATE_FIELDS)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(query);

        return { products, ...buildPaginationMeta(total, page, limit) };
    }

    async getById(id: string): Promise<IProduct | null> {
        return await Product.findById(id).populate(POPULATE_FIELDS);
    }

    async getPublishedByIds(ids: string[]): Promise<IProduct[]> {
        return await Product.find({ _id: { $in: ids }, status: "Published" }).populate(POPULATE_FIELDS);
    }

    async getSimilar(productId: string, categoryId: string, subcategoryId: string | undefined, limit: number): Promise<IProduct[]> {
        const baseQuery: any = { _id: { $ne: productId }, status: "Published", category: categoryId };

        // Prefer same-subcategory matches first (closer fit), then top up with
        // same-category products from other subcategories if there aren't enough.
        let results: IProduct[] = subcategoryId
            ? await Product.find({ ...baseQuery, subcategory: subcategoryId }).populate(POPULATE_FIELDS).limit(limit)
            : [];

        if (results.length < limit) {
            const excludeIds = [productId, ...results.map((r) => r._id.toString())];
            const fallback = await Product.find({ ...baseQuery, _id: { $nin: excludeIds } })
                .populate(POPULATE_FIELDS)
                .limit(limit - results.length);
            results = [...results, ...fallback];
        }

        return results;
    }

    async getCategoriesByProductIds(ids: string[]): Promise<{ id: string; category: string }[]> {
        if (ids.length === 0) return [];
        const products = await Product.find({ _id: { $in: ids } }).select("category");
        return products.map((p) => ({ id: p._id.toString(), category: p.category.toString() }));
    }

    async getRecommendedByCategories(categoryIds: string[], excludeIds: string[], limit: number): Promise<IProduct[]> {
        if (categoryIds.length === 0) return [];
        return await Product.find({
            category: { $in: categoryIds },
            _id: { $nin: excludeIds },
            status: "Published",
            availability: "In Stock"
        })
            .populate(POPULATE_FIELDS)
            .sort({ bestSeller: -1, featured: -1, createdAt: -1 })
            .limit(limit);
    }

    async getByVariantKey(variantKey: string): Promise<IProduct | null> {
        return await Product.findOne({ variantKey }).populate(POPULATE_FIELDS);
    }

    async searchForAssistant(params: IAssistantSearchParams): Promise<IProduct[]> {
        const { keywords, categoryIds, brandIds, maxPrice, limit } = params;

        const query: any = { status: "Published", availability: "In Stock" };

        if (keywords.length > 0) {
            // Every keyword must hit at least one field — an AND of per-keyword ORs —
            // so a multi-word query like "gaming laptop" narrows rather than widens.
            // Matched against name + structured specifications only, not the prose
            // description fields — a headset's description mentioning "compatible
            // with laptops" or "great for gaming" would otherwise false-positive
            // against a "gaming laptop" query even though it isn't one.
            query.$and = keywords.map((keyword) => {
                const regex = { $regex: keyword, $options: "i" };
                const or: any[] = [
                    { name: regex },
                    { "specifications.value": regex }
                ];
                if (categoryIds && categoryIds.length > 0) or.push({ category: { $in: categoryIds } });
                if (brandIds && brandIds.length > 0) or.push({ brand: { $in: brandIds } });
                return { $or: or };
            });
        }

        if (maxPrice !== undefined) {
            query.sellingPrice = { $lte: maxPrice };
        }

        return await Product.find(query)
            .populate(POPULATE_FIELDS)
            .sort({ bestSeller: -1, featured: -1, createdAt: -1 })
            .limit(limit);
    }

    async update(id: string, product: Record<string, any>): Promise<IProduct | null> {
        return await Product.findByIdAndUpdate(
            id,
            { $set: stripUndefined(product) },
            { new: true, runValidators: true }
        ).populate(POPULATE_FIELDS);
    }

    async updateStatus(id: string, status: "Draft" | "Published"): Promise<IProduct | null> {
        return await Product.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true, runValidators: true }
        ).populate(POPULATE_FIELDS);
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await Product.findByIdAndDelete(id);
        return !!deleted;
    }

    async bulkDelete(ids: string[]): Promise<number> {
        if (ids.length === 0) return 0;
        const result = await Product.deleteMany({ _id: { $in: ids } });
        return result.deletedCount ?? 0;
    }

    async findByNames(names: string[]): Promise<IProduct[]> {
        if (names.length === 0) return [];
        return await Product.find({ name: { $in: names } });
    }

    async incrementStock(id: string, quantity: number): Promise<IProduct | null> {
        // Aggregation-pipeline update: the stockQuantity increment and the
        // resulting availability flip happen as one atomic operation, so
        // concurrent restocks/cancellations can't lose an update to each other.
        return await Product.findOneAndUpdate(
            { _id: id },
            [
                { $set: { stockQuantity: { $add: ["$stockQuantity", quantity] } } },
                {
                    $set: {
                        availability: {
                            $cond: [
                                { $and: [{ $gt: ["$stockQuantity", 0] }, { $eq: ["$availability", "Out of Stock"] }] },
                                "In Stock",
                                "$availability"
                            ]
                        }
                    }
                }
            ],
            { new: true, updatePipeline: true }
        ).populate(POPULATE_FIELDS);
    }

    async existsBySku(sku: string): Promise<boolean> {
        const found = await Product.exists({ sku });
        return !!found;
    }

    async decrementStock(id: string, quantity: number): Promise<IProduct | null> {
        // The stockQuantity >= quantity filter and the decrement happen in a
        // single atomic operation, so two concurrent orders can't both pass
        // a stale stock check and oversell the last units. Returns null when
        // there isn't enough stock, which the caller treats as a failure.
        // soldQuantity is a cumulative "ever sold" counter — it is intentionally
        // not reversed by incrementStock (rollback/cancellation), since it tracks
        // gross demand rather than net current standing (that's what stockQuantity is for).
        return await Product.findOneAndUpdate(
            { _id: id, stockQuantity: { $gte: quantity } },
            [
                {
                    $set: {
                        stockQuantity: { $subtract: ["$stockQuantity", quantity] },
                        soldQuantity: { $add: [{ $ifNull: ["$soldQuantity", 0] }, quantity] }
                    }
                },
                {
                    $set: {
                        availability: {
                            $cond: [{ $eq: ["$stockQuantity", 0] }, "Out of Stock", "$availability"]
                        }
                    }
                }
            ],
            { new: true, updatePipeline: true }
        ).populate(POPULATE_FIELDS);
    }
}
