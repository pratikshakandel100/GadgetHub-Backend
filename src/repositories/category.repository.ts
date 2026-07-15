import { CreateCategoryDTO } from "../dtos/category.dto";
import Category, { ICategory, ICategoryAttribute } from "../models/category.model";
import Product from "../models/product.model";
import { SortOrder } from "../utils/query.util";
import { stripUndefined } from "../utils/object.util";

export interface ICategoryWithCount extends Omit<ICategory, keyof import("mongoose").Document> {
    _id: import("mongoose").Types.ObjectId;
    productCount: number;
}

export interface ICategoryRepository {
    create(category: CreateCategoryDTO & { slug: string }): Promise<ICategory>;
    getAll(
        search: string,
        sort: Record<string, SortOrder>,
        page?: number,
        limit?: number
    ): Promise<{ categories: ICategoryWithCount[]; total: number }>;
    getPublished(search: string): Promise<ICategory[]>;
    getById(id: string): Promise<ICategory | null>;
    findByName(name: string): Promise<ICategory | null>;
    findBySlug(slug: string): Promise<ICategory | null>;
    update(id: string, category: Partial<ICategory>): Promise<ICategory | null>;
    updateAttributeSchema(id: string, attributeSchema: ICategoryAttribute[]): Promise<ICategory | null>;
    delete(id: string): Promise<boolean>;
    countProducts(id: string): Promise<number>;
}

export class CategoryMongoRepository implements ICategoryRepository {
    async create(category: CreateCategoryDTO & { slug: string }): Promise<ICategory> {
        return await Category.create(category);
    }

    async getAll(
        search: string,
        sort: Record<string, SortOrder>,
        page?: number,
        limit?: number
    ): Promise<{ categories: ICategoryWithCount[]; total: number }> {
        const filter = search
            ? { name: { $regex: search, $options: "i" } }
            : {};

        let query = Category.find(filter).sort(sort);
        if (page !== undefined && limit !== undefined) {
            query = query.skip((page - 1) * limit).limit(limit);
        }
        const categories = await query;
        const total = await Category.countDocuments(filter);

        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Product.countDocuments({ category: category._id });
                return {
                    ...category.toObject(),
                    productCount
                } as ICategoryWithCount;
            })
        );

        return { categories: categoriesWithCount, total };
    }

    async getPublished(search: string): Promise<ICategory[]> {
        const filter: any = { status: "Active" };
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }
        return await Category.find(filter).sort({ name: 1 });
    }

    async getById(id: string): Promise<ICategory | null> {
        return await Category.findById(id);
    }

    async findByName(name: string): Promise<ICategory | null> {
        return await Category.findOne({ name });
    }

    async findBySlug(slug: string): Promise<ICategory | null> {
        return await Category.findOne({ slug });
    }

    async update(id: string, category: Partial<ICategory>): Promise<ICategory | null> {
        return await Category.findByIdAndUpdate(
            id,
            { $set: stripUndefined(category) },
            { new: true, runValidators: true }
        );
    }

    async updateAttributeSchema(id: string, attributeSchema: ICategoryAttribute[]): Promise<ICategory | null> {
        return await Category.findByIdAndUpdate(
            id,
            { $set: { attributeSchema } },
            { new: true, runValidators: true }
        );
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await Category.findByIdAndDelete(id);
        return !!deleted;
    }

    async countProducts(id: string): Promise<number> {
        return await Product.countDocuments({ category: id });
    }
}
