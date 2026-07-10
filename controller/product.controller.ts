import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { ProductService } from "../services/product.service";
import { CreateProductDTO, UpdateProductDTO, UpdateProductStatusDTO } from "../dtos/product.dto";

const productService = new ProductService();

const mergeUploadedImages = (req: Request) => {
    const body = { ...req.body };
    if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (files.mainImage && files.mainImage[0]) {
            body.mainImage = "/uploads/" + files.mainImage[0].filename;
        }
        if (files.galleryImages) {
            body.galleryImages = files.galleryImages.map((file) => "/uploads/" + file.filename);
        }
        if (files.thumbnailImage && files.thumbnailImage[0]) {
            body.thumbnailImage = "/uploads/" + files.thumbnailImage[0].filename;
        }
    }
    return body;
};

export class ProductController {
    async createProduct(req: Request, res: Response) {
        try {
            const body = mergeUploadedImages(req);
            const productData = CreateProductDTO.safeParse(body);
            if (!productData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(productData.error), 400);
            }

            const product = await productService.createProduct(productData.data);
            return ApiResponseHelper.success(res, product, "Product created successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getAllProducts(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const search = (req.query.search as string) || "";
            const category = (req.query.category as string) || "";
            const status = (req.query.status as string) || "";

            const result = await productService.getAllProducts(page, limit, search, category, status);

            return ApiResponseHelper.success(res, result.products, "Products fetched successfully", 200, {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages
            });
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getPublishedProducts(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const search = (req.query.search as string) || "";
            const category = (req.query.category as string) || "";

            const result = await productService.getPublishedProducts(page, limit, search, category);

            return ApiResponseHelper.success(res, result.products, "Published products fetched successfully", 200, {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages
            });
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getProductById(req: Request<{ id: string }>, res: Response) {
        try {
            const product = await productService.getProductById(req.params.id);
            return ApiResponseHelper.success(res, product, "Product fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async updateProduct(req: Request<{ id: string }>, res: Response) {
        try {
            const body = mergeUploadedImages(req);
            const productData = UpdateProductDTO.safeParse(body);
            if (!productData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(productData.error), 400);
            }

            const product = await productService.updateProduct(req.params.id, productData.data);
            return ApiResponseHelper.success(res, product, "Product updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async updateStatus(req: Request<{ id: string }>, res: Response) {
        try {
            const statusData = UpdateProductStatusDTO.safeParse(req.body);
            if (!statusData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(statusData.error), 400);
            }

            const product = await productService.updateProductStatus(req.params.id, statusData.data.status);
            return ApiResponseHelper.success(res, product, "Product status updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async deleteProduct(req: Request<{ id: string }>, res: Response) {
        try {
            await productService.deleteProduct(req.params.id);
            return ApiResponseHelper.success(res, {}, "Product deleted successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
