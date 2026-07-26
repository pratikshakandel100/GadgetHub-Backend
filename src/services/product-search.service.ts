import { Meilisearch } from "meilisearch";
import Product, { IProduct } from "../models/product.model";
import { MEILISEARCH_API_KEY, MEILISEARCH_HOST } from "../config/constant";

const INDEX = "products";

type ProductSearchDocument = Record<string, unknown> & { id: string };

const SORTABLE_FIELDS = new Set(["sellingPrice", "originalPrice", "name", "createdAt", "soldQuantity", "deliveredQuantity"]);

export interface IAdminProductSearchParams {
    query: string;
    page: number;
    limit: number;
    category?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    sort: Record<string, 1 | -1>;
}

export interface IProductSearchListResult {
    products: ProductSearchDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/** Keeps the Meilisearch product index as a disposable read model of MongoDB. */
export class ProductSearchService {
    private readonly client = MEILISEARCH_HOST ? new Meilisearch({ host: MEILISEARCH_HOST, apiKey: MEILISEARCH_API_KEY || undefined }) : null;

    get enabled() {
        return this.client !== null;
    }

    private document(product: IProduct): ProductSearchDocument {
        const value = product.toObject() as Record<string, any>;
        return {
            ...value,
            id: product._id.toString(),
            _id: product._id.toString(),
            category: value.category ? { ...value.category, _id: value.category._id?.toString(), name: value.category.name } : null,
            brand: value.brand ? { ...value.brand, _id: value.brand._id?.toString(), name: value.brand.name } : null,
            subcategory: value.subcategory ? { ...value.subcategory, _id: value.subcategory._id?.toString(), name: value.subcategory.name } : null,
            specificationsText: (value.specifications || []).map((spec: { key: string; value: string }) => `${spec.key} ${spec.value}`).join(" ")
        };
    }

    async configure() {
        if (!this.client) return;
        const index = this.client.index(INDEX);
        await index.updateSettings({
            searchableAttributes: ["name", "sku", "brand.name", "category.name", "shortDescription", "fullDescription", "tags", "specificationsText"],
            filterableAttributes: ["status", "availability", "category.name", "category._id", "brand.name", "brand._id", "subcategory._id", "sellingPrice"],
            sortableAttributes: Array.from(SORTABLE_FIELDS),
            typoTolerance: { enabled: true }
        });
    }

    async upsert(product: IProduct) {
        if (!this.client) return;
        await this.client.index(INDEX).addDocuments([this.document(product)], { primaryKey: "id" });
    }

    async remove(id: string) {
        if (!this.client) return;
        await this.client.index(INDEX).deleteDocument(id);
    }

    async rebuild() {
        if (!this.client) return;
        await this.configure();
        const products = await Product.find().populate([{ path: "category", select: "name" }, { path: "subcategory", select: "name" }, { path: "brand", select: "name" }]);
        await this.client.index(INDEX).addDocuments(products.map((product) => this.document(product)), { primaryKey: "id" });
    }

    async search(query: string, limit: number) {
        if (!this.client) return null;
        const results = await this.client.index(INDEX).search<ProductSearchDocument>(query, {
            limit: Math.min(Math.max(limit, 1), 100),
            filter: ["status = Published"],
            attributesToHighlight: ["name", "shortDescription"]
        });
        return results.hits;
    }

    /** Same index as the storefront search, but unfiltered by status so admins can find drafts too. */
    async adminSearch(params: IAdminProductSearchParams): Promise<IProductSearchListResult | null> {
        if (!this.client) return null;

        const filter: string[] = [];
        if (params.category) filter.push(`category._id = ${params.category}`);
        if (params.status) filter.push(`status = ${params.status}`);
        if (params.minPrice !== undefined) filter.push(`sellingPrice >= ${params.minPrice}`);
        if (params.maxPrice !== undefined) filter.push(`sellingPrice <= ${params.maxPrice}`);

        const [sortField, sortOrder] = Object.entries(params.sort)[0] ?? ["createdAt", -1];
        const sort = SORTABLE_FIELDS.has(sortField) ? [`${sortField}:${sortOrder === 1 ? "asc" : "desc"}`] : undefined;

        const results = await this.client.index(INDEX).search<ProductSearchDocument>(params.query, {
            filter: filter.length > 0 ? filter : undefined,
            sort,
            page: params.page,
            hitsPerPage: params.limit
        });

        return {
            products: results.hits,
            total: results.totalHits ?? results.hits.length,
            page: results.page ?? params.page,
            limit: results.hitsPerPage ?? params.limit,
            totalPages: results.totalPages ?? 1
        };
    }
}
