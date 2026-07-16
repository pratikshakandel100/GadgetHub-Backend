import { ProductMongoRepository, IProductListResult } from "../repositories/product.repository";
import { CategoryMongoRepository } from "../repositories/category.repository";
import { BrandMongoRepository } from "../repositories/brand.repository";
import { CounterMongoRepository } from "../repositories/counter.repository";
import { ReviewMongoRepository } from "../repositories/review.repository";
import { CreateProductDTO, UpdateProductDTO } from "../dtos/product.dto";
import { IProduct } from "../models/product.model";
import { HttpException } from "../exceptions/http-exception";
import { buildVariantKey, buildSkuCodes, buildSkuSequenceKey, formatSku } from "../utils/sku.util";
import { ICategoryAttribute } from "../models/category.model";

const productRepository = new ProductMongoRepository();
const categoryRepository = new CategoryMongoRepository();
const brandRepository = new BrandMongoRepository();
const counterRepository = new CounterMongoRepository();
const reviewRepository = new ReviewMongoRepository();

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;
const MAX_COMPARE_PRODUCTS = 4;

export interface ICreateProductResult {
    product: IProduct;
    created: boolean;
}

export class ProductService {
    private validateCategoryAttributes(
        attributeSchema: ICategoryAttribute[],
        attributes: Record<string, string>
    ): void {
        for (const attr of attributeSchema) {
            const value = attributes[attr.key]?.trim();

            if (attr.required && !value) {
                throw new HttpException(400, `Missing required attribute: "${attr.label}"`);
            }
            if (value && attr.type === "select" && attr.options.length > 0 && !attr.options.includes(value)) {
                throw new HttpException(
                    400,
                    `Invalid value for "${attr.label}": must be one of ${attr.options.join(", ")}`
                );
            }
            if (value && attr.type === "number" && Number.isNaN(Number(value))) {
                throw new HttpException(400, `"${attr.label}" must be a number`);
            }
        }
    }

    async createProduct(productData: CreateProductDTO, sellerId: string): Promise<ICreateProductResult> {
        const category = await categoryRepository.getById(productData.category);
        if (!category) {
            throw new HttpException(404, "Category not found");
        }
        const brand = await brandRepository.getById(productData.brand);
        if (!brand) {
            throw new HttpException(404, "Brand not found");
        }

        this.validateCategoryAttributes(category.attributeSchema ?? [], productData.attributes);

        const variantKey = buildVariantKey(
            sellerId,
            productData.name,
            productData.brand,
            productData.category,
            productData.variantAttributes
        );

        // Fast path: an identical variant (same seller, name, brand, category,
        // and normalized attributes) already exists — restock it instead of
        // minting a duplicate SKU.
        const existing = await productRepository.getByVariantKey(variantKey);
        if (existing) {
            const restocked = await productRepository.incrementStock(existing._id.toString(), productData.stockQuantity);
            if (!restocked) {
                throw new HttpException(500, "Failed to update stock for the matching variant");
            }
            return { product: restocked, created: false };
        }

        const { categoryCode, brandCode, variantCode } = buildSkuCodes(category.name, brand.name, productData.variantAttributes);
        const sequenceKey = buildSkuSequenceKey(categoryCode, brandCode);
        const sequence = await counterRepository.getNextSequence(sequenceKey);
        const sku = formatSku(categoryCode, brandCode, variantCode, sequence);

        try {
            const created = await productRepository.create({ ...productData, sku, variantKey, seller: sellerId });
            return { product: created, created: true };
        } catch (error: any) {
            // Two concurrent requests for the exact same variant can both pass
            // the check above; the unique index on variantKey guarantees only
            // one insert wins. The loser lands here and falls back to the same
            // restock behavior instead of surfacing a confusing 500.
            if (error?.code === MONGO_DUPLICATE_KEY_ERROR_CODE && error?.keyPattern?.variantKey) {
                const raceWinner = await productRepository.getByVariantKey(variantKey);
                if (!raceWinner) {
                    throw new HttpException(500, "Failed to resolve a concurrent duplicate variant conflict");
                }
                const restocked = await productRepository.incrementStock(raceWinner._id.toString(), productData.stockQuantity);
                if (!restocked) {
                    throw new HttpException(500, "Failed to update stock for the matching variant");
                }
                return { product: restocked, created: false };
            }
            throw error;
        }
    }

    async getAllProducts(
        page: number,
        limit: number,
        search: string,
        category: string,
        status: string,
        sort: Record<string, 1 | -1>,
        minPrice?: number,
        maxPrice?: number
    ): Promise<IProductListResult> {
        return await productRepository.getAll(page, limit, search, category, status, sort, minPrice, maxPrice);
    }

    async getPublishedProducts(
        page: number,
        limit: number,
        search: string,
        category: string,
        sort: Record<string, 1 | -1>,
        minPrice?: number,
        maxPrice?: number
    ): Promise<IProductListResult> {
        return await productRepository.getPublished(page, limit, search, category, sort, minPrice, maxPrice);
    }

    async getProductById(id: string): Promise<IProduct> {
        const product = await productRepository.getById(id);
        if (!product) {
            throw new HttpException(404, "Product not found");
        }
        return product;
    }

    async getPublishedProductById(id: string): Promise<IProduct> {
        const product = await productRepository.getById(id);
        if (!product || product.status !== "Published") {
            throw new HttpException(404, "Product not found");
        }
        return product;
    }

    async getPublishedProductsByIds(ids: string[]): Promise<Record<string, unknown>[]> {
        const uniqueIds = Array.from(new Set(ids)).slice(0, MAX_COMPARE_PRODUCTS);
        if (uniqueIds.length === 0) {
            return [];
        }

        const products = await productRepository.getPublishedByIds(uniqueIds);
        const ratingSummary = await reviewRepository.getRatingSummaryByProductIds(uniqueIds);

        return products.map((product) => {
            const rating = ratingSummary[product._id.toString()];
            return {
                ...product.toObject(),
                averageRating: rating ? Math.round(rating.averageRating * 10) / 10 : 0,
                totalReviews: rating?.totalReviews ?? 0
            };
        });
    }

    async updateProduct(id: string, productData: UpdateProductDTO): Promise<IProduct> {
        const existingProduct = await productRepository.getById(id);
        if (!existingProduct) {
            throw new HttpException(404, "Product not found");
        }

        if (productData.category) {
            const category = await categoryRepository.getById(productData.category);
            if (!category) {
                throw new HttpException(404, "Category not found");
            }
        }
        if (productData.brand) {
            const brand = await brandRepository.getById(productData.brand);
            if (!brand) {
                throw new HttpException(404, "Brand not found");
            }
        }

        const updated = await productRepository.update(id, productData);
        if (!updated) {
            throw new HttpException(500, "Failed to update product");
        }
        return updated;
    }

    async updateProductStatus(id: string, status: "Draft" | "Published"): Promise<IProduct> {
        const existingProduct = await productRepository.getById(id);
        if (!existingProduct) {
            throw new HttpException(404, "Product not found");
        }

        const updated = await productRepository.updateStatus(id, status);
        if (!updated) {
            throw new HttpException(500, "Failed to update product status");
        }
        return updated;
    }

    async deleteProduct(id: string): Promise<void> {
        const existingProduct = await productRepository.getById(id);
        if (!existingProduct) {
            throw new HttpException(404, "Product not found");
        }

        const isDeleted = await productRepository.delete(id);
        if (!isDeleted) {
            throw new HttpException(500, "Failed to delete product");
        }
    }
}
