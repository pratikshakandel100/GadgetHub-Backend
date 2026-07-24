import { Meilisearch } from "meilisearch";
import Product, { IProduct } from "../models/product.model";
import { MEILISEARCH_API_KEY, MEILISEARCH_HOST } from "../config/constant";

const INDEX = "products";

type ProductSearchDocument = Record<string, unknown> & { id: string };

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
            filterableAttributes: ["status", "availability", "category.name", "brand.name", "sellingPrice"],
            sortableAttributes: ["sellingPrice", "createdAt", "soldQuantity"],
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
}
