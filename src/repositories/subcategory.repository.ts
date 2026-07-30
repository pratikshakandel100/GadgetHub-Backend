import { CreateSubcategoryDTO } from "../dtos/subcategory.dto";
import Subcategory, { ISubcategory } from "../models/subcategory.model";
import Product from "../models/product.model";
import { SortOrder } from "../utils/query.util";
import { stripUndefined } from "../utils/object.util";

export interface ISubcategoryWithCount extends Omit<ISubcategory, keyof import("mongoose").Document> {
    _id: import("mongoose").Types.ObjectId;
    productCount: number;
}

export interface ISubcategoryRepository {
    create(subcategory: CreateSubcategoryDTO & { slug: string }): Promise<ISubcategory>;
    bulkCreate(subcategories: (CreateSubcategoryDTO & { slug: string })[]): Promise<ISubcategory[]>;
    getAll(
        search: string,
        category: string,
        sort: Record<string, SortOrder>,
        page?: number,
        limit?: number
    ): Promise<{ subcategories: ISubcategoryWithCount[]; total: number }>;
    getPublished(search: string, category: string): Promise<ISubcategory[]>;
    getById(id: string): Promise<ISubcategory | null>;
    findByNameInCategory(name: string, category: string): Promise<ISubcategory | null>;
    findBySlug(slug: string): Promise<ISubcategory | null>;
    update(id: string, subcategory: Partial<ISubcategory>): Promise<ISubcategory | null>;
    delete(id: string): Promise<boolean>;
    countProducts(id: string): Promise<number>;
    countByCategory(category: string): Promise<number>;
}

export class SubcategoryMongoRepository implements ISubcategoryRepository {
    async create(subcategory: CreateSubcategoryDTO & { slug: string }): Promise<ISubcategory> {
        return await Subcategory.create(subcategory);
    }

    async bulkCreate(subcategories: (CreateSubcategoryDTO & { slug: string })[]): Promise<ISubcategory[]> {
        if (subcategories.length === 0) return [];
        try {
            return await Subcategory.insertMany(subcategories, { ordered: false });
        } catch (error: any) {
            if (Array.isArray(error?.insertedDocs)) {
                return error.insertedDocs;
            }
            throw error;
        }
    }

    async getAll(
        search: string,
        category: string,
        sort: Record<string, SortOrder>,
        page?: number,
        limit?: number
    ): Promise<{ subcategories: ISubcategoryWithCount[]; total: number }> {
        const filter: any = search ? { name: { $regex: search, $options: "i" } } : {};
        if (category) filter.category = category;

        let query = Subcategory.find(filter).populate("category", "name nameNe").sort(sort);
        if (page !== undefined && limit !== undefined) {
            query = query.skip((page - 1) * limit).limit(limit);
        }
        const subcategories = await query;
        const total = await Subcategory.countDocuments(filter);

        const subcategoriesWithCount = await Promise.all(
            subcategories.map(async (subcategory) => {
                const productCount = await Product.countDocuments({ subcategory: subcategory._id });
                return {
                    ...subcategory.toObject(),
                    productCount
                } as ISubcategoryWithCount;
            })
        );

        return { subcategories: subcategoriesWithCount, total };
    }

    async getPublished(search: string, category: string): Promise<ISubcategory[]> {
        const filter: any = { status: "Active" };
        if (search) filter.name = { $regex: search, $options: "i" };
        if (category) filter.category = category;
        return await Subcategory.find(filter).populate("category", "name nameNe").sort({ name: 1 });
    }

    async getById(id: string): Promise<ISubcategory | null> {
        return await Subcategory.findById(id).populate("category", "name nameNe");
    }

    async findByNameInCategory(name: string, category: string): Promise<ISubcategory | null> {
        return await Subcategory.findOne({ name, category });
    }

    async findBySlug(slug: string): Promise<ISubcategory | null> {
        return await Subcategory.findOne({ slug });
    }

    async update(id: string, subcategory: Partial<ISubcategory>): Promise<ISubcategory | null> {
        return await Subcategory.findByIdAndUpdate(
            id,
            { $set: stripUndefined(subcategory) },
            { new: true, runValidators: true }
        ).populate("category", "name nameNe");
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await Subcategory.findByIdAndDelete(id);
        return !!deleted;
    }

    async countProducts(id: string): Promise<number> {
        return await Product.countDocuments({ subcategory: id });
    }

    async countByCategory(category: string): Promise<number> {
        return await Subcategory.countDocuments({ category });
    }
}
