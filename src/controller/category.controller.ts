import { CategoryService } from "../services/category.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { CreateCategoryDTO, UpdateCategoryDTO, UpdateCategoryAttributesDTO } from "../dtos/category.dto";
import { mergeUploadedImage } from "../utils/upload.util";
import { parsePagination, parseSort, buildPaginationMeta } from "../utils/query.util";
import { buildEntityLinks, buildCollectionLinks } from "../utils/hateoas.util";
import { assertNotStale } from "../utils/precondition.util";

const categoryService = new CategoryService();

const CATEGORY_SORT_FIELDS = ["name", "createdAt"];

export class CategoryController {
    async createCategory(req: Request, res: Response) {
        const body = mergeUploadedImage(req, "image");
        const categoryData = CreateCategoryDTO.safeParse(body);
        if (!categoryData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(categoryData.error), 400);
        }
        const category = await categoryService.createCategory(categoryData.data);
        return ApiResponseHelper.success(res, category, "Category created successfully", 201, undefined, {
            location: buildEntityLinks(req, category._id.toString()).self.href,
            links: buildEntityLinks(req, category._id.toString())
        });
    }

    async getAllCategories(req: Request, res: Response) {
        const search = (req.query.search as string) || "";
        const sort = parseSort(req.query, CATEGORY_SORT_FIELDS, "createdAt", -1);
        const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;

        if (hasPagination) {
            const { page, limit } = parsePagination(req.query);
            const { categories, total } = await categoryService.getAllCategories(search, sort, page, limit);
            return ApiResponseHelper.success(
                res,
                categories,
                "Categories fetched successfully",
                200,
                buildPaginationMeta(total, page, limit),
                { cacheControl: "private, no-store", links: buildCollectionLinks(req, page, limit, total) }
            );
        }

        const { categories } = await categoryService.getAllCategories(search, sort);
        return ApiResponseHelper.success(res, categories, "Categories fetched successfully", 200, undefined, {
            cacheControl: "private, no-store"
        });
    }

    async getPublishedCategories(req: Request, res: Response) {
        const search = (req.query.search as string) || "";
        const categories = await categoryService.getPublishedCategories(search);
        return ApiResponseHelper.success(res, categories, "Categories fetched successfully", 200, undefined, {
            cacheControl: "public, max-age=30"
        });
    }

    async getCategoryById(req: Request<{ id: string }>, res: Response) {
        const category = await categoryService.getCategoryById(req.params.id);
        return ApiResponseHelper.success(res, category, "Category fetched successfully", 200, undefined, {
            cacheControl: "private, no-store",
            links: buildEntityLinks(req, category._id.toString())
        });
    }

    async updateCategory(req: Request<{ id: string }>, res: Response) {
        const existing = await categoryService.getCategoryById(req.params.id);
        assertNotStale(req, existing);

        const body = mergeUploadedImage(req, "image");
        const categoryData = UpdateCategoryDTO.safeParse(body);
        if (!categoryData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(categoryData.error), 400);
        }
        const category = await categoryService.updateCategory(req.params.id, categoryData.data);
        return ApiResponseHelper.success(res, category, "Category updated successfully", 200, undefined, {
            links: buildEntityLinks(req, category._id.toString())
        });
    }

    async getCategoryAttributes(req: Request<{ id: string }>, res: Response) {
        const attributes = await categoryService.getCategoryAttributes(req.params.id);
        return ApiResponseHelper.success(res, attributes, "Category attribute schema fetched successfully");
    }

    async updateCategoryAttributes(req: Request<{ id: string }>, res: Response) {
        const parsed = UpdateCategoryAttributesDTO.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
        }
        const category = await categoryService.updateCategoryAttributes(req.params.id, parsed.data.attributeSchema);
        return ApiResponseHelper.success(res, category, "Category attribute schema updated successfully", 200, undefined, {
            links: buildEntityLinks(req, category._id.toString())
        });
    }

    async deleteCategory(req: Request<{ id: string }>, res: Response) {
        const existing = await categoryService.getCategoryById(req.params.id);
        assertNotStale(req, existing);

        await categoryService.deleteCategory(req.params.id);
        return ApiResponseHelper.success(res, {}, "Category deleted successfully");
    }
}
