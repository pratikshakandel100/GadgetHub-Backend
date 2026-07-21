import { SubcategoryService } from "../services/subcategory.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { CreateSubcategoryDTO, UpdateSubcategoryDTO, BulkCreateSubcategoryDTO } from "../dtos/subcategory.dto";
import { parsePagination, parseSort, buildPaginationMeta } from "../utils/query.util";
import { buildEntityLinks, buildCollectionLinks } from "../utils/hateoas.util";
import { assertNotStale } from "../utils/precondition.util";

const subcategoryService = new SubcategoryService();

const SUBCATEGORY_SORT_FIELDS = ["name", "createdAt"];

export class SubcategoryController {
    async createSubcategory(req: Request, res: Response) {
        const subcategoryData = CreateSubcategoryDTO.safeParse(req.body);
        if (!subcategoryData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(subcategoryData.error), 400);
        }
        const subcategory = await subcategoryService.createSubcategory(subcategoryData.data);
        return ApiResponseHelper.success(res, subcategory, "Subcategory created successfully", 201, undefined, {
            location: buildEntityLinks(req, subcategory._id.toString()).self.href,
            links: buildEntityLinks(req, subcategory._id.toString())
        });
    }

    async bulkCreateSubcategories(req: Request, res: Response) {
        const parsed = BulkCreateSubcategoryDTO.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
        }
        const result = await subcategoryService.bulkCreateSubcategories(parsed.data);
        return ApiResponseHelper.success(
            res,
            result,
            `${result.insertedCount} of ${parsed.data.length} subcategories inserted successfully`,
            201
        );
    }

    async getAllSubcategories(req: Request, res: Response) {
        const search = (req.query.search as string) || "";
        const category = (req.query.category as string) || "";
        const sort = parseSort(req.query, SUBCATEGORY_SORT_FIELDS, "createdAt", -1);
        const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;

        if (hasPagination) {
            const { page, limit } = parsePagination(req.query);
            const { subcategories, total } = await subcategoryService.getAllSubcategories(search, category, sort, page, limit);
            return ApiResponseHelper.success(
                res,
                subcategories,
                "Subcategories fetched successfully",
                200,
                buildPaginationMeta(total, page, limit),
                { cacheControl: "private, no-store", links: buildCollectionLinks(req, page, limit, total) }
            );
        }

        const { subcategories } = await subcategoryService.getAllSubcategories(search, category, sort);
        return ApiResponseHelper.success(res, subcategories, "Subcategories fetched successfully", 200, undefined, {
            cacheControl: "private, no-store"
        });
    }

    async getPublishedSubcategories(req: Request, res: Response) {
        const search = (req.query.search as string) || "";
        const category = (req.query.category as string) || "";
        const subcategories = await subcategoryService.getPublishedSubcategories(search, category);
        return ApiResponseHelper.success(res, subcategories, "Subcategories fetched successfully", 200, undefined, {
            cacheControl: "public, max-age=30"
        });
    }

    async getSubcategoryById(req: Request<{ id: string }>, res: Response) {
        const subcategory = await subcategoryService.getSubcategoryById(req.params.id);
        return ApiResponseHelper.success(res, subcategory, "Subcategory fetched successfully", 200, undefined, {
            cacheControl: "private, no-store",
            links: buildEntityLinks(req, subcategory._id.toString())
        });
    }

    async updateSubcategory(req: Request<{ id: string }>, res: Response) {
        const existing = await subcategoryService.getSubcategoryById(req.params.id);
        assertNotStale(req, existing);

        const subcategoryData = UpdateSubcategoryDTO.safeParse(req.body);
        if (!subcategoryData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(subcategoryData.error), 400);
        }
        const subcategory = await subcategoryService.updateSubcategory(req.params.id, subcategoryData.data);
        return ApiResponseHelper.success(res, subcategory, "Subcategory updated successfully", 200, undefined, {
            links: buildEntityLinks(req, subcategory._id.toString())
        });
    }

    async deleteSubcategory(req: Request<{ id: string }>, res: Response) {
        const existing = await subcategoryService.getSubcategoryById(req.params.id);
        assertNotStale(req, existing);

        await subcategoryService.deleteSubcategory(req.params.id);
        return ApiResponseHelper.success(res, {}, "Subcategory deleted successfully");
    }
}
