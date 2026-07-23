import { InventoryMongoRepository, IInventoryFilters, IInventoryListResult, IInventorySummary } from "../repositories/inventory.repository";
import { StockMovementMongoRepository, IStockMovementListResult } from "../repositories/stock-movement.repository";
import { ProductMongoRepository } from "../repositories/product.repository";
import { NotificationService } from "./notification.service";
import { IProduct } from "../models/product.model";
import { HttpException } from "../exceptions/http-exception";

const inventoryRepository = new InventoryMongoRepository();
const stockMovementRepository = new StockMovementMongoRepository();
const productRepository = new ProductMongoRepository();
const notificationService = new NotificationService();

export class InventoryService {
    async getInventoryList(filters: IInventoryFilters, page: number, limit: number): Promise<IInventoryListResult> {
        return await inventoryRepository.getList(filters, page, limit);
    }

    async getSummary(): Promise<IInventorySummary> {
        return await inventoryRepository.getSummary();
    }

    async restock(productId: string, quantity: number, adminId: string): Promise<IProduct> {
        const updated = await inventoryRepository.restock(productId, quantity, adminId);
        if (!updated) {
            throw new HttpException(404, "Product not found");
        }

        const previousStock = updated.stockQuantity - quantity;
        await stockMovementRepository.create({
            product: productId,
            type: "restock",
            quantityDelta: quantity,
            previousStock,
            newStock: updated.stockQuantity,
            performedBy: adminId
        });

        return updated;
    }

    async adjustStock(productId: string, delta: number, reason: string, adminId: string): Promise<IProduct> {
        const existing = await productRepository.getById(productId);
        if (!existing) {
            throw new HttpException(404, "Product not found");
        }

        const updated = await inventoryRepository.adjustStock(productId, delta, adminId);
        if (!updated) {
            throw new HttpException(400, `Cannot reduce stock below zero (current stock: ${existing.stockQuantity})`);
        }

        const previousStock = updated.stockQuantity - delta;
        await stockMovementRepository.create({
            product: productId,
            type: "adjustment",
            quantityDelta: delta,
            previousStock,
            newStock: updated.stockQuantity,
            reason,
            performedBy: adminId
        });

        if (delta < 0) {
            await notificationService.notifyAdminsLowStockIfCrossed(previousStock, updated);
        }

        return updated;
    }

    async getStockHistory(productId: string, page: number, limit: number): Promise<IStockMovementListResult> {
        return await stockMovementRepository.getByProduct(productId, page, limit);
    }
}
