import { CategoryMongoRepository, ICategoryWithCount } from "../repositories/category.repository";
import { CreateCategoryDTO, UpdateCategoryDTO } from "../dtos/category.dto";
import { ICategory, ICategoryAttribute } from "../models/category.model";
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

    async getCategoryAttributes(id: string): Promise<ICategoryAttribute[]> {
        const category = await categoryRepository.getById(id);
        if (!category) {
            throw new HttpException(404, "Category not found");
        }
        return category.attributeSchema ?? [];
    }

    async updateCategoryAttributes(id: string, attributeSchema: ICategoryAttribute[]): Promise<ICategory> {
        const existingCategory = await categoryRepository.getById(id);
        if (!existingCategory) {
            throw new HttpException(404, "Category not found");
        }

        const keys = attributeSchema.map((attr) => attr.key.trim().toLowerCase());
        const duplicateKey = keys.find((key, index) => keys.indexOf(key) !== index);
        if (duplicateKey) {
            throw new HttpException(400, `Duplicate attribute key: "${duplicateKey}"`);
        }

        for (const attr of attributeSchema) {
            if (attr.type === "select" && attr.options.length === 0) {
                throw new HttpException(400, `Attribute "${attr.label}" is type "select" but has no options`);
            }
        }

        const updated = await categoryRepository.updateAttributeSchema(id, attributeSchema);
        if (!updated) {
            throw new HttpException(500, "Failed to update category attribute schema");
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
