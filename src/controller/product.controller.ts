import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { ProductService, searchPublishedProducts } from "../services/product.service";
import { CreateProductDTO, UpdateProductDTO, UpdateProductStatusDTO, BulkCreateProductDTO, BulkDeleteProductDTO } from "../dtos/product.dto";
import { mergeUploadedImages } from "../utils/upload.util";
import { parsePagination, parseSort } from "../utils/query.util";
import { buildEntityLinks, buildCollectionLinks, buildResourceUrl, HateoasLinks } from "../utils/hateoas.util";
import { assertNotStale } from "../utils/precondition.util";

const productService = new ProductService();

const IMAGE_FIELDS = [
    { field: "mainImage" },
    { field: "galleryImages", multiple: true },
    { field: "thumbnailImage" }
];

const PRODUCT_SORT_FIELDS = ["sellingPrice", "originalPrice", "name", "createdAt"];

const productLinks = (req: Request, product: any): HateoasLinks => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const extra: HateoasLinks = {};
    if (product.category?._id) {
        extra.category = { href: `${origin}/api/v1/categories/${product.category._id}`, method: "GET" };
    }
    if (product.brand?._id) {
        extra.brand = { href: `${origin}/api/v1/brands/${product.brand._id}`, method: "GET" };
    }
    return buildEntityLinks(req, product._id.toString(), extra);
};

export class ProductController {
    async createProduct(req: Request, res: Response) {
        const sellerId = req.user!._id.toString();

        const body = mergeUploadedImages(req, IMAGE_FIELDS);
        const productData = CreateProductDTO.safeParse(body);
        if (!productData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(productData.error), 400);
        }

        const { product, created } = await productService.createProduct(productData.data, sellerId);
        return ApiResponseHelper.success(
            res,
            product,
            created
                ? "Product created successfully"
                : "A matching variant already exists — stock quantity was updated instead of creating a duplicate",
            created ? 201 : 200,
            undefined,
            {
                location: created ? buildResourceUrl(req, product._id.toString()) : undefined,
                links: productLinks(req, product)
            }
        );
    }

    async bulkCreateProducts(req: Request, res: Response) {
        const sellerId = req.user!._id.toString();

        const parsed = BulkCreateProductDTO.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
        }

        const result = await productService.bulkCreateProducts(parsed.data, sellerId);
        return ApiResponseHelper.success(
            res,
            result,
            `${result.insertedCount} of ${parsed.data.length} products inserted successfully`,
            201
        );
    }

    async getAllProducts(req: Request, res: Response) {
        const { page, limit } = parsePagination(req.query);
        const search = (req.query.search as string) || "";
        const category = (req.query.category as string) || "";
        const status = (req.query.status as string) || "";
        const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
        const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
        const sort = parseSort(req.query, PRODUCT_SORT_FIELDS, "createdAt", -1);

        const result = await productService.getAllProducts(page, limit, search, category, status, sort, minPrice, maxPrice);

        return ApiResponseHelper.success(res, result.products, "Products fetched successfully", 200, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }, {
            cacheControl: "private, no-store",
            links: buildCollectionLinks(req, result.page, result.limit, result.total)
        });
    }

    async getPublishedProducts(req: Request, res: Response) {
        const { page, limit } = parsePagination(req.query);
        const search = (req.query.search as string) || "";
        const category = (req.query.category as string) || "";
        const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
        const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
        const sort = parseSort(req.query, PRODUCT_SORT_FIELDS, "createdAt", -1);

        const result = await productService.getPublishedProducts(page, limit, search, category, sort, minPrice, maxPrice);

        return ApiResponseHelper.success(res, result.products, "Published products fetched successfully", 200, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }, {
            cacheControl: "public, max-age=30",
            links: buildCollectionLinks(req, result.page, result.limit, result.total)
        });
    }

    async searchPublishedProducts(req: Request, res: Response) {
        const query = String(req.query.q || "").trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const products = await searchPublishedProducts(query, limit);
        return ApiResponseHelper.success(res, products, "Search results fetched successfully", 200, undefined, {
            cacheControl: "public, max-age=15"
        });
    }

    async getProductById(req: Request<{ id: string }>, res: Response) {
        const product = await productService.getProductById(req.params.id);
        return ApiResponseHelper.success(res, product, "Product fetched successfully", 200, undefined, {
            cacheControl: "private, no-store",
            links: productLinks(req, product)
        });
    }

    async getPublishedProductById(req: Request<{ id: string }>, res: Response) {
        const product = await productService.getPublishedProductById(req.params.id);
        return ApiResponseHelper.success(res, product, "Product fetched successfully", 200, undefined, {
            cacheControl: "public, max-age=30",
            links: productLinks(req, product)
        });
    }

    async recordProductView(req: Request<{ id: string }>, res: Response) {
        await productService.recordProductView(req.params.id);
        return ApiResponseHelper.success(res, null, "View recorded");
    }

    async getSimilarProducts(req: Request<{ id: string }>, res: Response) {
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const products = await productService.getSimilarProducts(req.params.id, limit);
        return ApiResponseHelper.success(res, products, "Similar products fetched successfully", 200, undefined, {
            cacheControl: "public, max-age=30"
        });
    }

    async getPublishedProductsByIds(req: Request, res: Response) {
        const idsParam = (req.query.ids as string) || "";
        const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

        const products = await productService.getPublishedProductsByIds(ids);
        return ApiResponseHelper.success(res, products, "Products fetched successfully", 200, undefined, {
            cacheControl: "public, max-age=30"
        });
    }

    async getProductRatings(req: Request, res: Response) {
        const idsParam = (req.query.ids as string) || "";
        const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

        const ratings = await productService.getProductRatings(ids);
        return ApiResponseHelper.success(res, ratings, "Ratings fetched successfully");
    }

    async updateProduct(req: Request<{ id: string }>, res: Response) {
        const existing = await productService.getProductById(req.params.id);
        assertNotStale(req, existing);

        const body = mergeUploadedImages(req, IMAGE_FIELDS);
        const productData = UpdateProductDTO.safeParse(body);
        if (!productData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(productData.error), 400);
        }

        const product = await productService.updateProduct(req.params.id, productData.data);
        return ApiResponseHelper.success(res, product, "Product updated successfully", 200, undefined, {
            links: productLinks(req, product)
        });
    }

    async updateStatus(req: Request<{ id: string }>, res: Response) {
        const statusData = UpdateProductStatusDTO.safeParse(req.body);
        if (!statusData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(statusData.error), 400);
        }

        const product = await productService.updateProductStatus(req.params.id, statusData.data.status);
        return ApiResponseHelper.success(res, product, "Product status updated successfully", 200, undefined, {
            links: productLinks(req, product)
        });
    }

    async bulkDeleteProducts(req: Request, res: Response) {
        const parsed = BulkDeleteProductDTO.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
        }
        const result = await productService.bulkDeleteProducts(parsed.data.ids, parsed.data.names);
        return ApiResponseHelper.success(
            res,
            result,
            `${result.deletedCount} product(s) deleted successfully`,
            200
        );
    }

    async deleteProduct(req: Request<{ id: string }>, res: Response) {
        const existing = await productService.getProductById(req.params.id);
        assertNotStale(req, existing);

        await productService.deleteProduct(req.params.id);
        return ApiResponseHelper.success(res, {}, "Product deleted successfully");
    }
}
