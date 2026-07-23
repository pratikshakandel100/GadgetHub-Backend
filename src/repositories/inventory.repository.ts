import mongoose from "mongoose";
import Product, { IProduct } from "../models/product.model";
import { buildPaginationMeta } from "../utils/query.util";

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface IInventoryFilters {
    status?: StockStatus;
    category?: string;
    brand?: string;
    search?: string;
    recentlyRestocked?: boolean;
}

export interface IInventoryListResult {
    products: IProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IInventorySummary {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
}

const RECENTLY_RESTOCKED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const POPULATE_FIELDS = [
    { path: "category", select: "name" },
    { path: "brand", select: "name" },
    { path: "lastStockUpdatedBy", select: "fullname email" }
];

// Low/In Stock compare stockQuantity against each product's own minimumStockAlert,
// so $expr is required — a plain query filter can't compare two fields of the
// same document against each other.
const stockStatusQuery = (status?: StockStatus): Record<string, unknown> => {
    switch (status) {
        case "Out of Stock":
            return { stockQuantity: 0 };
        case "Low Stock":
            return { stockQuantity: { $gt: 0 }, $expr: { $lte: ["$stockQuantity", "$minimumStockAlert"] } };
        case "In Stock":
            return { $expr: { $gt: ["$stockQuantity", "$minimumStockAlert"] } };
        default:
            return {};
    }
};

const buildQuery = (filters: IInventoryFilters): Record<string, unknown> => {
    const query: Record<string, unknown> = { ...stockStatusQuery(filters.status) };

    if (filters.category) query.category = filters.category;
    if (filters.brand) query.brand = filters.brand;
    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: "i" } },
            { sku: { $regex: filters.search, $options: "i" } }
        ];
    }
    if (filters.recentlyRestocked) {
        query.lastRestockedAt = { $gte: new Date(Date.now() - RECENTLY_RESTOCKED_WINDOW_MS) };
    }

    return query;
};

export class InventoryMongoRepository {
    async getList(filters: IInventoryFilters, page: number, limit: number): Promise<IInventoryListResult> {
        const query = buildQuery(filters);
        const skip = (page - 1) * limit;

        const products = await Product.find(query)
            .populate(POPULATE_FIELDS)
            .sort({ stockQuantity: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(query);

        return { products, ...buildPaginationMeta(total, page, limit) };
    }

    async getSummary(): Promise<IInventorySummary> {
        const [totalProducts, inStock, lowStock, outOfStock] = await Promise.all([
            Product.countDocuments(),
            Product.countDocuments(stockStatusQuery("In Stock")),
            Product.countDocuments(stockStatusQuery("Low Stock")),
            Product.countDocuments(stockStatusQuery("Out of Stock"))
        ]);

        return { totalProducts, inStock, lowStock, outOfStock };
    }

    async restock(id: string, quantity: number, adminId: string): Promise<IProduct | null> {
        // Same atomic-pipeline pattern as ProductMongoRepository.incrementStock,
        // plus the restock bookkeeping fields in the same update. Pipeline updates
        // bypass Mongoose casting, so lastStockUpdatedBy needs an explicit ObjectId.
        return await Product.findOneAndUpdate(
            { _id: id },
            [
                { $set: { stockQuantity: { $add: ["$stockQuantity", quantity] } } },
                {
                    $set: {
                        availability: {
                            $cond: [
                                { $and: [{ $gt: ["$stockQuantity", 0] }, { $eq: ["$availability", "Out of Stock"] }] },
                                "In Stock",
                                "$availability"
                            ]
                        },
                        lastRestockedAt: new Date(),
                        lastStockUpdatedBy: new mongoose.Types.ObjectId(adminId)
                    }
                }
            ],
            { new: true, updatePipeline: true }
        ).populate(POPULATE_FIELDS);
    }

    async adjustStock(id: string, delta: number, adminId: string): Promise<IProduct | null> {
        // Query guard: stockQuantity + delta >= 0. When delta is negative this
        // caps how much can be subtracted; when delta is positive it's always true.
        return await Product.findOneAndUpdate(
            { _id: id, stockQuantity: { $gte: -delta } },
            [
                { $set: { stockQuantity: { $add: ["$stockQuantity", delta] } } },
                {
                    $set: {
                        availability: {
                            $cond: [
                                { $eq: ["$stockQuantity", 0] },
                                "Out of Stock",
                                {
                                    $cond: [
                                        { $and: [{ $gt: ["$stockQuantity", 0] }, { $eq: ["$availability", "Out of Stock"] }] },
                                        "In Stock",
                                        "$availability"
                                    ]
                                }
                            ]
                        },
                        lastStockUpdatedBy: new mongoose.Types.ObjectId(adminId)
                    }
                }
            ],
            { new: true, updatePipeline: true }
        ).populate(POPULATE_FIELDS);
    }
}
