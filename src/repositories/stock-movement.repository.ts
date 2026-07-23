import StockMovement, { IStockMovement, StockMovementType } from "../models/stock-movement.model";
import { buildPaginationMeta } from "../utils/query.util";

export interface ICreateStockMovementData {
    product: string;
    type: StockMovementType;
    quantityDelta: number;
    previousStock: number;
    newStock: number;
    reason?: string;
    order?: string;
    orderNumber?: string;
    performedBy?: string;
}

export interface IStockMovementListResult {
    movements: IStockMovement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IStockMovementRepository {
    create(data: ICreateStockMovementData): Promise<IStockMovement>;
    getByProduct(productId: string, page: number, limit: number): Promise<IStockMovementListResult>;
}

const PERFORMED_BY_POPULATE = { path: "performedBy", select: "fullname email" };

export class StockMovementMongoRepository implements IStockMovementRepository {
    async create(data: ICreateStockMovementData): Promise<IStockMovement> {
        return await StockMovement.create(data);
    }

    async getByProduct(productId: string, page: number, limit: number): Promise<IStockMovementListResult> {
        const query = { product: productId };
        const skip = (page - 1) * limit;

        const movements = await StockMovement.find(query)
            .populate(PERFORMED_BY_POPULATE)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await StockMovement.countDocuments(query);

        return { movements, ...buildPaginationMeta(total, page, limit) };
    }
}
