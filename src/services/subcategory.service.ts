import { SubcategoryMongoRepository, ISubcategoryWithCount } from "../repositories/subcategory.repository";
import { CategoryMongoRepository } from "../repositories/category.repository";
import { CreateSubcategoryDTO, UpdateSubcategoryDTO } from "../dtos/subcategory.dto";
import { ISubcategory } from "../models/subcategory.model";
import { HttpException } from "../exceptions/http-exception";

const subcategoryRepository = new SubcategoryMongoRepository();
const categoryRepository = new CategoryMongoRepository();

const slugify = (name: string): string =>
    name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

export class SubcategoryService {
    async createSubcategory(subcategoryData: CreateSubcategoryDTO): Promise<ISubcategory> {
        const category = await categoryRepository.getById(subcategoryData.category);
        if (!category) {
            throw new HttpException(404, "Category not found");
        }

        const existingName = await subcategoryRepository.findByNameInCategory(
            subcategoryData.name,
            subcategoryData.category
        );
        if (existingName) {
            throw new HttpException(400, "Subcategory name already exists in this category");
        }

        let slug = slugify(subcategoryData.name);
        const existingSlug = await subcategoryRepository.findBySlug(slug);
        if (existingSlug) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }

        return await subcategoryRepository.create({ ...subcategoryData, slug });
    }

    async getAllSubcategories(
        search: string,
        category: string,
        sort: Record<string, 1 | -1>,
        page?: number,
        limit?: number
    ): Promise<{ subcategories: ISubcategoryWithCount[]; total: number }> {
        return await subcategoryRepository.getAll(search, category, sort, page, limit);
    }

    async getPublishedSubcategories(search: string, category: string): Promise<ISubcategory[]> {
        return await subcategoryRepository.getPublished(search, category);
    }

    async getSubcategoryById(id: string): Promise<ISubcategory> {
        const subcategory = await subcategoryRepository.getById(id);
        if (!subcategory) {
            throw new HttpException(404, "Subcategory not found");
        }
        return subcategory;
    }

    async updateSubcategory(id: string, subcategoryData: UpdateSubcategoryDTO): Promise<ISubcategory> {
        const existingSubcategory = await subcategoryRepository.getById(id);
        if (!existingSubcategory) {
            throw new HttpException(404, "Subcategory not found");
        }

        const targetCategory = subcategoryData.category ?? existingSubcategory.category.toString();
        if (subcategoryData.category) {
            const category = await categoryRepository.getById(subcategoryData.category);
            if (!category) {
                throw new HttpException(404, "Category not found");
            }
        }

        const updatePayload: Partial<ISubcategory> = { ...subcategoryData } as unknown as Partial<ISubcategory>;

        if (subcategoryData.name && (subcategoryData.name !== existingSubcategory.name || subcategoryData.category)) {
            const existingName = await subcategoryRepository.findByNameInCategory(subcategoryData.name, targetCategory);
            if (existingName && existingName._id.toString() !== id) {
                throw new HttpException(400, "Subcategory name already exists in this category");
            }
            updatePayload.slug = slugify(subcategoryData.name);
        }

        const updated = await subcategoryRepository.update(id, updatePayload);
        if (!updated) {
            throw new HttpException(500, "Failed to update subcategory");
        }
        return updated;
    }

    async deleteSubcategory(id: string): Promise<void> {
        const existingSubcategory = await subcategoryRepository.getById(id);
        if (!existingSubcategory) {
            throw new HttpException(404, "Subcategory not found");
        }

        const productCount = await subcategoryRepository.countProducts(id);
        if (productCount > 0) {
            throw new HttpException(400, "Cannot delete subcategory with existing products");
        }

        const isDeleted = await subcategoryRepository.delete(id);
        if (!isDeleted) {
            throw new HttpException(500, "Failed to delete subcategory");
        }
    }
}
