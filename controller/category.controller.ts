import { CategoryService } from "../services/category.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { CreateCategoryDTO, UpdateCategoryDTO } from "../dtos/category.dto";

const categoryService = new CategoryService();

export class CategoryController {
    async createCategory(req: Request, res: Response) {
        try {
            const categoryData = CreateCategoryDTO.safeParse(req.body);
            if (!categoryData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(categoryData.error), 400);
            }
            const category = await categoryService.createCategory(categoryData.data);
            return ApiResponseHelper.success(res, category, "Category created successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getAllCategories(req: Request, res: Response) {
        try {
            const search = (req.query.search as string) || "";
            const categories = await categoryService.getAllCategories(search);
            return ApiResponseHelper.success(res, categories, "Categories fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getCategoryById(req: Request<{ id: string }>, res: Response) {
        try {
            const category = await categoryService.getCategoryById(req.params.id);
            return ApiResponseHelper.success(res, category, "Category fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async updateCategory(req: Request<{ id: string }>, res: Response) {
        try {
            const categoryData = UpdateCategoryDTO.safeParse(req.body);
            if (!categoryData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(categoryData.error), 400);
            }
            const category = await categoryService.updateCategory(req.params.id, categoryData.data);
            return ApiResponseHelper.success(res, category, "Category updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async deleteCategory(req: Request<{ id: string }>, res: Response) {
        try {
            await categoryService.deleteCategory(req.params.id);
            return ApiResponseHelper.success(res, {}, "Category deleted successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
