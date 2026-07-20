import { BrandService } from "../services/brand.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { CreateBrandDTO, UpdateBrandDTO, BulkCreateBrandDTO } from "../dtos/brand.dto";

const brandService = new BrandService();

const mergeUploadedImage = (req: Request) => {
    const body = { ...req.body };
    if (req.file) {
        body.image = "/uploads/" + req.file.filename;
    }
    return body;
};

export class BrandController {
    async createBrand(req: Request, res: Response) {
        try {
            const body = mergeUploadedImage(req);
            const brandData = CreateBrandDTO.safeParse(body);
            if (!brandData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(brandData.error), 400);
            }
            const brand = await brandService.createBrand(brandData.data);
            return ApiResponseHelper.success(res, brand, "Brand created successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async bulkCreateBrands(req: Request, res: Response) {
        try {
            const parsed = BulkCreateBrandDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
            }
            const result = await brandService.bulkCreateBrands(parsed.data);
            return ApiResponseHelper.success(
                res,
                result,
                `${result.insertedCount} of ${parsed.data.length} brands inserted successfully`,
                201
            );
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getAllBrands(req: Request, res: Response) {
        try {
            const search = (req.query.search as string) || "";
            const brands = await brandService.getAllBrands(search);
            return ApiResponseHelper.success(res, brands, "Brands fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getBrandById(req: Request<{ id: string }>, res: Response) {
        try {
            const brand = await brandService.getBrandById(req.params.id);
            return ApiResponseHelper.success(res, brand, "Brand fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async updateBrand(req: Request<{ id: string }>, res: Response) {
        try {
            const body = mergeUploadedImage(req);
            const brandData = UpdateBrandDTO.safeParse(body);
            if (!brandData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(brandData.error), 400);
            }
            const brand = await brandService.updateBrand(req.params.id, brandData.data);
            return ApiResponseHelper.success(res, brand, "Brand updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async deleteBrand(req: Request<{ id: string }>, res: Response) {
        try {
            await brandService.deleteBrand(req.params.id);
            return ApiResponseHelper.success(res, {}, "Brand deleted successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
