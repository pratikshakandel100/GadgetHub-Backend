import { CategoryMongoRepository, ICategoryWithCount } from "../repositories/category.repository";
import { CreateCategoryDTO, UpdateCategoryDTO } from "../dtos/category.dto";
import { ICategory } from "../models/category.model";
import { HttpException } from "../exceptions/http-exception";

const categoryRepository = new CategoryMongoRepository();

const slugify = (name: string): string =>
    name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

export class CategoryService {
    async createCategory(categoryData: CreateCategoryDTO): Promise<ICategory> {
        const existingName = await categoryRepository.findByName(categoryData.name);
        if (existingName) {
            throw new HttpException(400, "Category name already exists");
        }

        let slug = slugify(categoryData.name);
        const existingSlug = await categoryRepository.findBySlug(slug);
        if (existingSlug) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }

        return await categoryRepository.create({ ...categoryData, slug });
    }

    async getAllCategories(search: string): Promise<ICategoryWithCount[]> {
        return await categoryRepository.getAll(search);
    }

    async getCategoryById(id: string): Promise<ICategory> {
        const category = await categoryRepository.getById(id);
        if (!category) {
            throw new HttpException(404, "Category not found");
        }
        return category;
    }

    async updateCategory(id: string, categoryData: UpdateCategoryDTO): Promise<ICategory> {
        const existingCategory = await categoryRepository.getById(id);
        if (!existingCategory) {
            throw new HttpException(404, "Category not found");
        }

        const updatePayload: Partial<ICategory> = { ...categoryData };

        if (categoryData.name && categoryData.name !== existingCategory.name) {
            const existingName = await categoryRepository.findByName(categoryData.name);
            if (existingName) {
                throw new HttpException(400, "Category name already exists");
            }
            updatePayload.slug = slugify(categoryData.name);
        }

        const updated = await categoryRepository.update(id, updatePayload);
        if (!updated) {
            throw new HttpException(500, "Failed to update category");
        }
        return updated;
    }

    async deleteCategory(id: string): Promise<void> {
        const existingCategory = await categoryRepository.getById(id);
        if (!existingCategory) {
            throw new HttpException(404, "Category not found");
        }

        const productCount = await categoryRepository.countProducts(id);
        if (productCount > 0) {
            throw new HttpException(400, "Cannot delete category with existing products");
        }

        const isDeleted = await categoryRepository.delete(id);
        if (!isDeleted) {
            throw new HttpException(500, "Failed to delete category");
        }
    }
}
