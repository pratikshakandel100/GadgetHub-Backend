import { CreateCategoryDTO } from "../dtos/category.dto";
import Category, { ICategory } from "../models/category.model";
import Product from "../models/product.model";

export interface ICategoryWithCount extends Omit<ICategory, keyof import("mongoose").Document> {
    _id: import("mongoose").Types.ObjectId;
    productCount: number;
}

export interface ICategoryRepository {
    create(category: CreateCategoryDTO & { slug: string }): Promise<ICategory>;
    getAll(search: string): Promise<ICategoryWithCount[]>;
    getById(id: string): Promise<ICategory | null>;
    findByName(name: string): Promise<ICategory | null>;
    findBySlug(slug: string): Promise<ICategory | null>;
    update(id: string, category: Partial<ICategory>): Promise<ICategory | null>;
    delete(id: string): Promise<boolean>;
    countProducts(id: string): Promise<number>;
}

export class CategoryMongoRepository implements ICategoryRepository {
    async create(category: CreateCategoryDTO & { slug: string }): Promise<ICategory> {
        return await Category.create(category);
    }

    async getAll(search: string): Promise<ICategoryWithCount[]> {
        const filter = search
            ? { name: { $regex: search, $options: "i" } }
            : {};

        const categories = await Category.find(filter).sort({ createdAt: -1 });

        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Product.countDocuments({ category: category._id });
                return {
                    ...category.toObject(),
                    productCount
                } as ICategoryWithCount;
            })
        );

        return categoriesWithCount;
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
        const filteredCategory = Object.fromEntries(
            Object.entries(category).filter(([_, value]) => value !== undefined)
        );
        return await Category.findByIdAndUpdate(
            id,
            { $set: filteredCategory },
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
