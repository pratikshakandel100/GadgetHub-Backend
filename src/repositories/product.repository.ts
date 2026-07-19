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
    getByVariantKey(variantKey: string): Promise<IProduct | null>;
    searchForAssistant(params: IAssistantSearchParams): Promise<IProduct[]>;
    update(id: string, product: Record<string, any>): Promise<IProduct | null>;
    updateStatus(id: string, status: "Draft" | "Published"): Promise<IProduct | null>;
    incrementStock(id: string, quantity: number): Promise<IProduct | null>;
    decrementStock(id: string, quantity: number): Promise<IProduct | null>;
    delete(id: string): Promise<boolean>;
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

    async incrementStock(id: string, quantity: number): Promise<IProduct | null> {
        const product = await Product.findById(id);
        if (!product) return null;

        product.stockQuantity = product.stockQuantity + quantity;
        if (product.stockQuantity > 0 && product.availability === "Out of Stock") {
            product.availability = "In Stock";
        }
        await product.save();
        return product.populate(POPULATE_FIELDS);
    }

    async existsBySku(sku: string): Promise<boolean> {
        const found = await Product.exists({ sku });
        return !!found;
    }

    async decrementStock(id: string, quantity: number): Promise<IProduct | null> {
        const product = await Product.findById(id);
        if (!product) return null;

        product.stockQuantity = Math.max(0, product.stockQuantity - quantity);
        if (product.stockQuantity === 0) {
            product.availability = "Out of Stock";
        }
        await product.save();
        return product.populate(POPULATE_FIELDS);
    }
}
