import { ProductMongoRepository, IProductListResult, ICreateProductData } from "../repositories/product.repository";
import { CategoryMongoRepository } from "../repositories/category.repository";
import { SubcategoryMongoRepository } from "../repositories/subcategory.repository";
import { BrandMongoRepository } from "../repositories/brand.repository";
import { CounterMongoRepository } from "../repositories/counter.repository";
import { ReviewMongoRepository } from "../repositories/review.repository";
import { CreateProductDTO, UpdateProductDTO } from "../dtos/product.dto";
import { IProduct } from "../models/product.model";
import { HttpException } from "../exceptions/http-exception";
import { buildVariantKey, buildSkuCodes, buildSkuSequenceKey, formatSku } from "../utils/sku.util";
import { slugify } from "../utils/slug.util";
import { ICategoryAttribute } from "../models/category.model";
import { ProductSearchService } from "./product-search.service";

const PRODUCT_CODE_SEQUENCE_KEY = "productCode";
const PRODUCT_CODE_PREFIX = "GH";

const formatProductCode = (sequence: number): string =>
    `${PRODUCT_CODE_PREFIX}${String(sequence).padStart(6, "0")}`;

const productRepository = new ProductMongoRepository();
const categoryRepository = new CategoryMongoRepository();
const subcategoryRepository = new SubcategoryMongoRepository();
const brandRepository = new BrandMongoRepository();
const counterRepository = new CounterMongoRepository();
const reviewRepository = new ReviewMongoRepository();
const productSearchService = new ProductSearchService();

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;
const MAX_COMPARE_PRODUCTS = 4;
const DEFAULT_SIMILAR_LIMIT = 6;
const MAX_SIMILAR_LIMIT = 12;

export interface ICreateProductResult {
    product: IProduct;
    created: boolean;
}

export class ProductService {
    private syncSearch(product: IProduct) {
        void productSearchService.upsert(product).catch((error) => console.error("Failed to update Meilisearch product index", error));
    }
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

    private isObjectId(value: string): boolean {
        return /^[0-9a-fA-F]{24}$/.test(value);
    }

    private async validateSubcategory(subcategoryId: string, categoryId: string): Promise<void> {
        const subcategory = await subcategoryRepository.getById(subcategoryId);
        if (!subcategory) {
            throw new HttpException(404, "Subcategory not found");
        }
        // `category` is populated by the repository, so unwrap its `_id` rather than
        // treating it as a raw ObjectId.
        const categoryRef = subcategory.category as unknown as { _id: { toString(): string } };
        if (categoryRef._id.toString() !== categoryId) {
            throw new HttpException(400, "Subcategory does not belong to the selected category");
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
        if (productData.subcategory) {
            await this.validateSubcategory(productData.subcategory, productData.category);
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
            this.syncSearch(restocked);
            return { product: restocked, created: false };
        }

        const { categoryCode, brandCode, variantCode } = buildSkuCodes(category.name, brand.name, productData.variantAttributes);
        const sequenceKey = buildSkuSequenceKey(categoryCode, brandCode);
        const sequence = await counterRepository.getNextSequence(sequenceKey);
        const sku = formatSku(categoryCode, brandCode, variantCode, sequence);
        const slug = slugify(productData.name);
        const productCode = formatProductCode(await counterRepository.getNextSequence(PRODUCT_CODE_SEQUENCE_KEY));

        try {
            const created = await productRepository.create({ ...productData, sku, slug, productCode, variantKey, seller: sellerId });
            this.syncSearch(created);
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
                this.syncSearch(restocked);
                return { product: restocked, created: false };
            }
            throw error;
        }
    }

    async bulkCreateProducts(productsData: CreateProductDTO[], sellerId: string): Promise<{
        insertedCount: number;
        inserted: IProduct[];
        failed: { index: number; name?: string; reason: string }[];
    }> {
        const toInsert: ICreateProductData[] = [];
        const failed: { index: number; name?: string; reason: string }[] = [];
        const seenVariantKeys = new Set<string>();

        for (let index = 0; index < productsData.length; index++) {
            const productData = productsData[index];
            try {
                // Bulk imports are often hand-written outside the admin UI (e.g. via
                // Postman), where the operator knows category/brand/subcategory
                // *names*, not their ObjectIds. Accept either: a 24-hex-char string
                // is looked up by id, anything else is resolved by name.
                const category = this.isObjectId(productData.category)
                    ? await categoryRepository.getById(productData.category)
                    : await categoryRepository.findByName(productData.category);
                if (!category) throw new HttpException(404, `Category not found: "${productData.category}"`);

                const brand = this.isObjectId(productData.brand)
                    ? await brandRepository.getById(productData.brand)
                    : await brandRepository.findByName(productData.brand);
                if (!brand) throw new HttpException(404, `Brand not found: "${productData.brand}"`);

                const categoryId = category._id.toString();
                const brandId = brand._id.toString();

                let subcategoryId: string | undefined;
                if (productData.subcategory) {
                    const subcategory = this.isObjectId(productData.subcategory)
                        ? await subcategoryRepository.getById(productData.subcategory)
                        : await subcategoryRepository.findByNameInCategory(productData.subcategory, categoryId);
                    if (!subcategory) throw new HttpException(404, `Subcategory not found: "${productData.subcategory}"`);
                    subcategoryId = subcategory._id.toString();
                }

                this.validateCategoryAttributes(category.attributeSchema ?? [], productData.attributes);

                const variantKey = buildVariantKey(
                    sellerId,
                    productData.name,
                    brandId,
                    categoryId,
                    productData.variantAttributes
                );

                if (seenVariantKeys.has(variantKey)) {
                    throw new HttpException(400, "Duplicate variant within the submitted batch");
                }
                const existingVariant = await productRepository.getByVariantKey(variantKey);
                if (existingVariant) {
                    throw new HttpException(400, "A matching variant already exists");
                }

                const { categoryCode, brandCode, variantCode } = buildSkuCodes(category.name, brand.name, productData.variantAttributes);
                const sequenceKey = buildSkuSequenceKey(categoryCode, brandCode);
                const sequence = await counterRepository.getNextSequence(sequenceKey);
                const sku = formatSku(categoryCode, brandCode, variantCode, sequence);

                const skuExists = await productRepository.existsBySku(sku);
                if (skuExists) {
                    throw new HttpException(400, `Duplicate SKU: ${sku}`);
                }

                const slug = slugify(productData.name);
                const productCode = formatProductCode(await counterRepository.getNextSequence(PRODUCT_CODE_SEQUENCE_KEY));

                seenVariantKeys.add(variantKey);
                toInsert.push({
                    ...productData,
                    category: categoryId,
                    brand: brandId,
                    subcategory: subcategoryId,
                    sku,
                    slug,
                    productCode,
                    variantKey,
                    seller: sellerId
                });
            } catch (error: any) {
                failed.push({ index, name: productData?.name, reason: error.message || "Failed to validate product" });
            }
        }

        const inserted = await productRepository.bulkCreate(toInsert);
        inserted.forEach((product) => this.syncSearch(product));
        return { insertedCount: inserted.length, inserted, failed };
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
        if (search && productSearchService.enabled) {
            try {
                const result = await productSearchService.adminSearch({ query: search, page, limit, category, status, minPrice, maxPrice, sort });
                if (result) return result as unknown as IProductListResult;
            } catch (error) {
                // Admin browsing stays available during a Meilisearch restart or a
                // temporary network failure; MongoDB is still the source of truth.
                console.error("Meilisearch admin product search failed; falling back to MongoDB", error);
            }
        }
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

    async getPublishedProductById(idOrCode: string): Promise<IProduct> {
        const product = this.isObjectId(idOrCode)
            ? await productRepository.getById(idOrCode)
            : await productRepository.getByCode(idOrCode);
        if (!product || product.status !== "Published") {
            throw new HttpException(404, "Product not found");
        }
        // Best-effort — a failed view-count increment shouldn't fail the page load.
        productRepository.incrementViewCount(product._id.toString()).catch(() => {});
        return product;
    }

    // Admin-only, unbounded (no MAX_COMPARE_PRODUCTS cap, no Published-only
    // filter) — the shopper-facing compare endpoint intentionally restricts
    // both, but the admin analytics page needs ratings for any product.
    async getProductRatings(ids: string[]): Promise<Record<string, { averageRating: number; totalReviews: number }>> {
        const uniqueIds = Array.from(new Set(ids));
        if (uniqueIds.length === 0) {
            return {};
        }
        const ratingSummary = await reviewRepository.getRatingSummaryByProductIds(uniqueIds);
        return Object.fromEntries(
            Object.entries(ratingSummary).map(([id, rating]) => [
                id,
                { averageRating: Math.round(rating.averageRating * 10) / 10, totalReviews: rating.totalReviews }
            ])
        );
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

    async getSimilarProducts(id: string, limit: number = DEFAULT_SIMILAR_LIMIT): Promise<IProduct[]> {
        const product = await productRepository.getById(id);
        if (!product || product.status !== "Published") {
            throw new HttpException(404, "Product not found");
        }

        const clampedLimit = Math.min(Math.max(1, limit), MAX_SIMILAR_LIMIT);
        // category/subcategory are populated refs on the fetched product, not raw ObjectIds.
        const categoryId = (product.category as unknown as { _id: { toString(): string } })._id.toString();
        const subcategoryId = product.subcategory
            ? (product.subcategory as unknown as { _id: { toString(): string } })._id.toString()
            : undefined;

        return await productRepository.getSimilar(id, categoryId, subcategoryId, clampedLimit);
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
        if (productData.subcategory) {
            const effectiveCategoryId = productData.category ?? (existingProduct.category as unknown as { _id: { toString(): string } })._id.toString();
            await this.validateSubcategory(productData.subcategory, effectiveCategoryId);
        }

        const updated = await productRepository.update(id, productData);
        if (!updated) {
            throw new HttpException(500, "Failed to update product");
        }
        this.syncSearch(updated);
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
        this.syncSearch(updated);
        return updated;
    }

    async bulkDeleteProducts(ids: string[], names: string[]): Promise<{
        deletedCount: number;
        notFound: string[];
    }> {
        const notFound: string[] = [];
        const idsToDelete = new Set<string>();

        for (const id of ids) {
            if (this.isObjectId(id)) {
                idsToDelete.add(id);
            } else {
                notFound.push(id);
            }
        }

        if (names.length > 0) {
            const found = await productRepository.findByNames(names);
            const foundNames = new Set(found.map((p) => p.name));
            found.forEach((p) => idsToDelete.add(p._id.toString()));
            names.forEach((name) => {
                if (!foundNames.has(name)) notFound.push(name);
            });
        }

        const deletedCount = await productRepository.bulkDelete(Array.from(idsToDelete));
        for (const id of idsToDelete) void productSearchService.remove(id).catch((error) => console.error("Failed to remove Meilisearch product", error));
        return { deletedCount, notFound };
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
        void productSearchService.remove(id).catch((error) => console.error("Failed to remove Meilisearch product", error));
    }
}

export const searchPublishedProducts = async (query: string, limit: number) => {
    try {
        const searchResults = await productSearchService.search(query, limit);
        if (searchResults) return searchResults;
    } catch (error) {
        // Search remains available during a Meilisearch restart or a temporary
        // network failure; MongoDB is still the source of truth.
        console.error("Meilisearch query failed; falling back to MongoDB", error);
    }
    const fallback = await productRepository.getPublished(1, limit, query, "", { createdAt: -1 });
    return fallback.products;
};
