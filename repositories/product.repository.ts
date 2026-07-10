import { CreateProductDTO } from "../dtos/product.dto";
import Product, { IProduct } from "../models/product.model";

export interface IProductListResult {
    products: IProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IProductRepository {
    create(product: CreateProductDTO & { sku: string }): Promise<IProduct>;
    getAll(
        page: number,
        limit: number,
        search: string,
        category: string,
        status: string
    ): Promise<IProductListResult>;
    getPublished(
        page: number,
        limit: number,
        search: string,
        category: string
    ): Promise<IProductListResult>;
    getById(id: string): Promise<IProduct | null>;
    update(id: string, product: Record<string, any>): Promise<IProduct | null>;
    updateStatus(id: string, status: "Draft" | "Published"): Promise<IProduct | null>;
    delete(id: string): Promise<boolean>;
    existsBySku(sku: string): Promise<boolean>;
}

const POPULATE_FIELDS = [
    { path: "category", select: "name" },
    { path: "brand", select: "name" }
];

export class ProductMongoRepository implements IProductRepository {
    async create(product: CreateProductDTO & { sku: string }): Promise<IProduct> {
        const created = await Product.create(product);
        return created.populate(POPULATE_FIELDS);
    }

    async getAll(
        page: number,
        limit: number,
        search: string,
        category: string,
        status: string
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

        const skip = (page - 1) * limit;
        const products = await Product.find(query)
            .populate(POPULATE_FIELDS)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(query);

        return {
            products,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getPublished(
        page: number,
        limit: number,
        search: string,
        category: string
    ): Promise<IProductListResult> {
        const query: any = { status: "Published" };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } }
            ];
        }
        if (category) query.category = category;

        const skip = (page - 1) * limit;
        const products = await Product.find(query)
            .populate(POPULATE_FIELDS)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(query);

        return {
            products,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getById(id: string): Promise<IProduct | null> {
        return await Product.findById(id).populate(POPULATE_FIELDS);
    }

    async update(id: string, product: Record<string, any>): Promise<IProduct | null> {
        const filteredProduct = Object.fromEntries(
            Object.entries(product).filter(([_, value]) => value !== undefined)
        );
        return await Product.findByIdAndUpdate(
            id,
            { $set: filteredProduct },
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

    async existsBySku(sku: string): Promise<boolean> {
        const found = await Product.exists({ sku });
        return !!found;
    }
}
