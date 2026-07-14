import { CreateBrandDTO } from "../dtos/brand.dto";
import Brand, { IBrand } from "../models/brand.model";
import Product from "../models/product.model";

export interface IBrandWithCount extends Omit<IBrand, keyof import("mongoose").Document> {
    _id: import("mongoose").Types.ObjectId;
    productCount: number;
}

export interface IBrandRepository {
    create(brand: CreateBrandDTO & { slug: string }): Promise<IBrand>;
    getAll(search: string): Promise<IBrandWithCount[]>;
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

    async getAll(search: string): Promise<IBrandWithCount[]> {
        const filter = search
            ? { name: { $regex: search, $options: "i" } }
            : {};

        const brands = await Brand.find(filter).sort({ createdAt: -1 });

        const brandsWithCount = await Promise.all(
            brands.map(async (brand) => {
                const productCount = await Product.countDocuments({ brand: brand._id });
                return {
                    ...brand.toObject(),
                    productCount
                } as IBrandWithCount;
            })
        );

        return brandsWithCount;
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
        const filteredBrand = Object.fromEntries(
            Object.entries(brand).filter(([_, value]) => value !== undefined)
        );
        return await Brand.findByIdAndUpdate(
            id,
            { $set: filteredBrand },
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
