import { CreateBrandDTO } from "../dtos/brand.dto";
import Brand, { IBrand } from "../models/brand.model";
import Product from "../models/product.model";
import { SortOrder } from "../utils/query.util";
import { stripUndefined } from "../utils/object.util";

export interface IBrandWithCount extends Omit<IBrand, keyof import("mongoose").Document> {
    _id: import("mongoose").Types.ObjectId;
    productCount: number;
}

export interface IBrandRepository {
    create(brand: CreateBrandDTO & { slug: string }): Promise<IBrand>;
    bulkCreate(brands: (CreateBrandDTO & { slug: string })[]): Promise<IBrand[]>;
    getAll(
        search: string,
        sort: Record<string, SortOrder>,
        page?: number,
        limit?: number
    ): Promise<{ brands: IBrandWithCount[]; total: number }>;
    getById(id: string): Promise<IBrand | null>;
    findByName(name: string): Promise<IBrand | null>;
    findBySlug(slug: string): Promise<IBrand | null>;
    update(id: string, brand: Partial<IBrand>): Promise<IBrand | null>;
    delete(id: string): Promise<boolean>;
    countProducts(id: string): Promise<number>;
}

export class BrandMongoRepository implements IBrandRepository {
    async create(brand: CreateBrandDTO & { slug: string }): Promise<IBrand> {
        return await Brand.create(brand);
    }

    async bulkCreate(brands: (CreateBrandDTO & { slug: string })[]): Promise<IBrand[]> {
        if (brands.length === 0) return [];
        try {
            return await Brand.insertMany(brands, { ordered: false });
        } catch (error: any) {
            if (Array.isArray(error?.insertedDocs)) {
                return error.insertedDocs;
            }
            throw error;
        }
    }

    async getAll(
        search: string,
        sort: Record<string, SortOrder>,
        page?: number,
        limit?: number
    ): Promise<{ brands: IBrandWithCount[]; total: number }> {
        const filter = search
            ? { name: { $regex: search, $options: "i" } }
            : {};

        let query = Brand.find(filter).sort(sort);
        if (page !== undefined && limit !== undefined) {
            query = query.skip((page - 1) * limit).limit(limit);
        }
        const brands = await query;
        const total = await Brand.countDocuments(filter);

        const brandsWithCount = await Promise.all(
            brands.map(async (brand) => {
                const productCount = await Product.countDocuments({ brand: brand._id });
                return {
                    ...brand.toObject(),
                    productCount
                } as IBrandWithCount;
            })
        );

        return { brands: brandsWithCount, total };
    }

    async getById(id: string): Promise<IBrand | null> {
        return await Brand.findById(id);
    }

    async findByName(name: string): Promise<IBrand | null> {
        return await Brand.findOne({ name });
    }

    async findBySlug(slug: string): Promise<IBrand | null> {
        return await Brand.findOne({ slug });
    }

    async update(id: string, brand: Partial<IBrand>): Promise<IBrand | null> {
        return await Brand.findByIdAndUpdate(
            id,
            { $set: stripUndefined(brand) },
            { new: true, runValidators: true }
        );
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await Brand.findByIdAndDelete(id);
        return !!deleted;
    }

    async countProducts(id: string): Promise<number> {
        return await Product.countDocuments({ brand: id });
    }
}
