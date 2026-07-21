import { Request, Response } from "express";
import { z } from "zod";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { InventoryService } from "../services/inventory.service";
import { RestockDTO, AdjustStockDTO } from "../dtos/inventory.dto";
import { parsePagination } from "../utils/query.util";
import { StockStatus } from "../repositories/inventory.repository";

const inventoryService = new InventoryService();

const VALID_STATUSES: StockStatus[] = ["In Stock", "Low Stock", "Out of Stock"];

export class InventoryController {
    async getInventoryList(req: Request, res: Response) {
        const { page, limit } = parsePagination(req.query, 20);
        const statusRaw = (req.query.status as string) || "";
        const status = VALID_STATUSES.includes(statusRaw as StockStatus) ? (statusRaw as StockStatus) : undefined;
        const category = (req.query.category as string) || undefined;
        const brand = (req.query.brand as string) || undefined;
        const search = (req.query.search as string) || undefined;
        const recentlyRestocked = req.query.recentlyRestocked === "true";

        const result = await inventoryService.getInventoryList({ status, category, brand, search, recentlyRestocked }, page, limit);

        return ApiResponseHelper.success(res, result.products, "Inventory fetched successfully", 200, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }, {
            cacheControl: "private, no-store"
        });
    }

    async getSummary(req: Request, res: Response) {
        const summary = await inventoryService.getSummary();
        return ApiResponseHelper.success(res, summary, "Inventory summary fetched successfully", 200, undefined, {
            cacheControl: "private, no-store"
        });
    }

    async restockProduct(req: Request<{ id: string }>, res: Response) {
        const parsed = RestockDTO.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
        }

        const adminId = req.user!._id.toString();
        const product = await inventoryService.restock(req.params.id, parsed.data.quantity, adminId);
        return ApiResponseHelper.success(res, product, "Product restocked successfully");
    }

    async adjustStock(req: Request<{ id: string }>, res: Response) {
        const parsed = AdjustStockDTO.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
        }

        const adminId = req.user!._id.toString();
        const product = await inventoryService.adjustStock(req.params.id, parsed.data.delta, parsed.data.reason, adminId);
        return ApiResponseHelper.success(res, product, "Stock adjusted successfully");
    }

    async getStockHistory(req: Request<{ id: string }>, res: Response) {
        const { page, limit } = parsePagination(req.query, 20);
        const result = await inventoryService.getStockHistory(req.params.id, page, limit);

        return ApiResponseHelper.success(res, result.movements, "Stock history fetched successfully", 200, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }, {
            cacheControl: "private, no-store"
        });
    }
}
