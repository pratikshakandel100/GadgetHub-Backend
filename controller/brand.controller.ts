import { BrandService } from "../services/brand.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { CreateBrandDTO, UpdateBrandDTO } from "../dtos/brand.dto";

const brandService = new BrandService();

export class BrandController {
    async createBrand(req: Request, res: Response) {
        try {
            const brandData = CreateBrandDTO.safeParse(req.body);
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
            const brandData = UpdateBrandDTO.safeParse(req.body);
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
