jest.mock("../../../src/repositories/inventory.repository", () => {
    const mockInventoryRepository = {
        getList: jest.fn(),
        getSummary: jest.fn(),
        restock: jest.fn(),
        adjustStock: jest.fn(),
    };
    return {
        InventoryMongoRepository: jest.fn().mockImplementation(() => mockInventoryRepository),
        __mockInventoryRepository: mockInventoryRepository,
    };
});

jest.mock("../../../src/repositories/stock-movement.repository", () => {
    const mockStockMovementRepository = { create: jest.fn(), getByProduct: jest.fn() };
    return {
        StockMovementMongoRepository: jest.fn().mockImplementation(() => mockStockMovementRepository),
        __mockStockMovementRepository: mockStockMovementRepository,
    };
});

jest.mock("../../../src/repositories/product.repository", () => {
    const mockProductRepository = { getById: jest.fn() };
    return {
        ProductMongoRepository: jest.fn().mockImplementation(() => mockProductRepository),
        __mockProductRepository: mockProductRepository,
    };
});

jest.mock("../../../src/services/notification.service", () => {
    const mockNotificationService = { notifyAdminsLowStockIfCrossed: jest.fn() };
    return {
        NotificationService: jest.fn().mockImplementation(() => mockNotificationService),
        __mockNotificationService: mockNotificationService,
    };
});

import { InventoryService } from "../../../src/services/inventory.service";
import * as InventoryRepoModule from "../../../src/repositories/inventory.repository";
import * as StockMovementRepoModule from "../../../src/repositories/stock-movement.repository";
import * as ProductRepoModule from "../../../src/repositories/product.repository";
import * as NotificationModule from "../../../src/services/notification.service";

const mockInventoryRepository = (InventoryRepoModule as any).__mockInventoryRepository;
const mockStockMovementRepository = (StockMovementRepoModule as any).__mockStockMovementRepository;
const mockProductRepository = (ProductRepoModule as any).__mockProductRepository;
const mockNotificationService = (NotificationModule as any).__mockNotificationService;

describe("InventoryService.restock", () => {
    it("throws 404 when the product doesn't exist", async () => {
        mockInventoryRepository.restock.mockResolvedValue(null);
        await expect(new InventoryService().restock("p1", 10, "admin1")).rejects.toThrow("Product not found");
    });

    it("logs a stock-movement record with the correct previous/new stock delta", async () => {
        mockInventoryRepository.restock.mockResolvedValue({ stockQuantity: 30 });

        await new InventoryService().restock("p1", 10, "admin1");

        expect(mockStockMovementRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: "restock", quantityDelta: 10, previousStock: 20, newStock: 30 })
        );
    });
});

describe("InventoryService.adjustStock", () => {
    it("throws 404 when the product doesn't exist", async () => {
        mockProductRepository.getById.mockResolvedValue(null);
        await expect(new InventoryService().adjustStock("p1", -5, "Damaged", "admin1")).rejects.toThrow("Product not found");
    });

    it("throws 400 with the current stock when the adjustment would go negative", async () => {
        mockProductRepository.getById.mockResolvedValue({ stockQuantity: 3 });
        mockInventoryRepository.adjustStock.mockResolvedValue(null);

        await expect(new InventoryService().adjustStock("p1", -10, "Damaged", "admin1")).rejects.toThrow(
            "Cannot reduce stock below zero (current stock: 3)"
        );
    });

    it("notifies admins of low stock when a negative adjustment crosses the threshold", async () => {
        mockProductRepository.getById.mockResolvedValue({ stockQuantity: 10 });
        mockInventoryRepository.adjustStock.mockResolvedValue({ stockQuantity: 2 });

        await new InventoryService().adjustStock("p1", -8, "Damaged", "admin1");

        expect(mockNotificationService.notifyAdminsLowStockIfCrossed).toHaveBeenCalled();
    });

    it("does NOT notify admins for a positive stock adjustment", async () => {
        mockProductRepository.getById.mockResolvedValue({ stockQuantity: 10 });
        mockInventoryRepository.adjustStock.mockResolvedValue({ stockQuantity: 15 });

        await new InventoryService().adjustStock("p1", 5, "Returned", "admin1");

        expect(mockNotificationService.notifyAdminsLowStockIfCrossed).not.toHaveBeenCalled();
    });
});
