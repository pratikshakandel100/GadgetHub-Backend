import crypto from "crypto";
import { ProductMongoRepository, IProductListResult } from "../repositories/product.repository";
import { CategoryMongoRepository } from "../repositories/category.repository";
import { BrandMongoRepository } from "../repositories/brand.repository";
import { CreateProductDTO, UpdateProductDTO } from "../dtos/product.dto";
import { IProduct } from "../models/product.model";
import { HttpException } from "../exceptions/http-exception";

const productRepository = new ProductMongoRepository();
const categoryRepository = new CategoryMongoRepository();
const brandRepository = new BrandMongoRepository();

const generateSku = async (): Promise<string> => {
    let sku: string;
    let exists = true;
    do {
        sku = `GH-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        exists = await productRepository.existsBySku(sku);
    } while (exists);
    return sku;
};

export class ProductService {
    async createProduct(productData: CreateProductDTO): Promise<IProduct> {
        const category = await categoryRepository.getById(productData.category);
        if (!category) {
            throw new HttpException(404, "Category not found");
        }
        const brand = await brandRepository.getById(productData.brand);
        if (!brand) {
            throw new HttpException(404, "Brand not found");
        }

        const sku = await generateSku();
        return await productRepository.create({ ...productData, sku });
    }

    async getAllProducts(
        page: number,
        limit: number,
        search: string,
        category: string,
        status: string
    ): Promise<IProductListResult> {
        return await productRepository.getAll(page, limit, search, category, status);
    }

    async getPublishedProducts(
        page: number,
        limit: number,
        search: string,
        category: string
    ): Promise<IProductListResult> {
        return await productRepository.getPublished(page, limit, search, category);
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
