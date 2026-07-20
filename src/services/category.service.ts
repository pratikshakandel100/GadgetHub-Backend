import { CategoryMongoRepository, ICategoryWithCount } from "../repositories/category.repository";
import { SubcategoryMongoRepository } from "../repositories/subcategory.repository";
import { CreateCategoryDTO, UpdateCategoryDTO, BulkCreateCategoryItemDTO, BulkCreateSubcategoryItemDTO } from "../dtos/category.dto";
import { ICategory, ICategoryAttribute } from "../models/category.model";
import { ISubcategory } from "../models/subcategory.model";
import { HttpException } from "../exceptions/http-exception";

const categoryRepository = new CategoryMongoRepository();
const subcategoryRepository = new SubcategoryMongoRepository();

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

    async bulkCreateCategories(categoriesData: BulkCreateCategoryItemDTO[]): Promise<{
        insertedCount: number;
        inserted: ICategory[];
        skipped: { name: string; reason: string }[];
        subcategories: {
            insertedCount: number;
            inserted: ISubcategory[];
            skipped: { name: string; category: string; reason: string }[];
        };
    }> {
        const seenNames = new Set<string>();
        const seenSlugs = new Set<string>();
        const toInsert: (CreateCategoryDTO & { slug: string })[] = [];
        const skipped: { name: string; reason: string }[] = [];
        // Subcategories arrive nested under a category that doesn't have an _id
        // yet, so stash them keyed by normalized category name and reattach
        // once we know which categories actually made it into the DB.
        const pendingSubcategoriesByName = new Map<string, BulkCreateSubcategoryItemDTO[]>();

        for (const { subcategories, ...categoryData } of categoriesData) {
            const normalizedName = categoryData.name.trim().toLowerCase();
            if (seenNames.has(normalizedName)) {
                skipped.push({ name: categoryData.name, reason: "Duplicate name in request payload" });
                continue;
            }

            const existingName = await categoryRepository.findByName(categoryData.name);
            if (existingName) {
                skipped.push({ name: categoryData.name, reason: "Category name already exists" });
                continue;
            }

            let slug = slugify(categoryData.name);
            if (seenSlugs.has(slug) || await categoryRepository.findBySlug(slug)) {
                slug = `${slug}-${Date.now().toString(36)}${seenSlugs.size}`;
            }

            seenNames.add(normalizedName);
            seenSlugs.add(slug);
            toInsert.push({ ...categoryData, slug });
            if (subcategories && subcategories.length > 0) {
                pendingSubcategoriesByName.set(normalizedName, subcategories);
            }
        }

        const inserted = await categoryRepository.bulkCreate(toInsert);
        const subcategoryResult = await this.bulkCreateSubcategoriesForNewCategories(inserted, pendingSubcategoriesByName);

        return { insertedCount: inserted.length, inserted, skipped, subcategories: subcategoryResult };
    }

    private async bulkCreateSubcategoriesForNewCategories(
        insertedCategories: ICategory[],
        pendingSubcategoriesByName: Map<string, BulkCreateSubcategoryItemDTO[]>
    ): Promise<{
        insertedCount: number;
        inserted: ISubcategory[];
        skipped: { name: string; category: string; reason: string }[];
    }> {
        const seenSlugs = new Set<string>();
        const toInsert: { name: string; category: string; status: "Active" | "Inactive"; slug: string }[] = [];
        const skipped: { name: string; category: string; reason: string }[] = [];

        for (const category of insertedCategories) {
            const subcategories = pendingSubcategoriesByName.get(category.name.trim().toLowerCase());
            if (!subcategories) continue;

            const seenNamesInCategory = new Set<string>();
            for (const subcategoryData of subcategories) {
                const normalizedName = subcategoryData.name.trim().toLowerCase();
                if (seenNamesInCategory.has(normalizedName)) {
                    skipped.push({ name: subcategoryData.name, category: category.name, reason: "Duplicate name in request payload" });
                    continue;
                }
                seenNamesInCategory.add(normalizedName);

                let slug = slugify(subcategoryData.name);
                if (seenSlugs.has(slug) || await subcategoryRepository.findBySlug(slug)) {
                    slug = `${slug}-${Date.now().toString(36)}${seenSlugs.size}`;
                }
                seenSlugs.add(slug);

                toInsert.push({
                    name: subcategoryData.name,
                    category: category._id.toString(),
                    status: subcategoryData.status,
                    slug
                });
            }
        }

        const inserted = await subcategoryRepository.bulkCreate(toInsert);
        return { insertedCount: inserted.length, inserted, skipped };
    }

    async getAllCategories(
        search: string,
        sort: Record<string, 1 | -1>,
        page?: number,
        limit?: number
    ): Promise<{ categories: ICategoryWithCount[]; total: number }> {
        return await categoryRepository.getAll(search, sort, page, limit);
    }

    async getPublishedCategories(search: string): Promise<ICategory[]> {
        return await categoryRepository.getPublished(search);
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

        const subcategoryCount = await subcategoryRepository.countByCategory(id);
        if (subcategoryCount > 0) {
            throw new HttpException(400, "Cannot delete category with existing subcategories");
        }

        const isDeleted = await categoryRepository.delete(id);
        if (!isDeleted) {
            throw new HttpException(500, "Failed to delete category");
        }
    }
}
