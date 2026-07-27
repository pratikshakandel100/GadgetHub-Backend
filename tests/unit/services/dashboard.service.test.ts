jest.mock("../../../src/repositories/dashboard.repository", () => {
    const mockDashboardRepository = {
        getRecentOrders: jest.fn(),
        getLowStockProducts: jest.fn(),
        getTodayStats: jest.fn(),
        getTotals: jest.fn(),
    };
    return {
        DashboardMongoRepository: jest.fn().mockImplementation(() => mockDashboardRepository),
        __mockDashboardRepository: mockDashboardRepository,
    };
});

import { DashboardService } from "../../../src/services/dashboard.service";
import * as DashboardRepoModule from "../../../src/repositories/dashboard.repository";

const mockDashboardRepository = (DashboardRepoModule as any).__mockDashboardRepository;

describe("DashboardService.getDashboardSummary", () => {
    it("assembles recentOrders, lowStockProducts, today's stats and totals into one summary", async () => {
        mockDashboardRepository.getRecentOrders.mockResolvedValue([{ orderNumber: "ORD-1" }]);
        mockDashboardRepository.getLowStockProducts.mockResolvedValue([{ name: "Low Stock Item" }]);
        mockDashboardRepository.getTodayStats.mockResolvedValue({ ordersToday: 3, revenueToday: 1500, newUsersToday: 2 });
        mockDashboardRepository.getTotals.mockResolvedValue({ totalRevenue: 100000, totalOrders: 50 });

        const summary = await new DashboardService().getDashboardSummary();

        expect(summary.recentOrders).toEqual([{ orderNumber: "ORD-1" }]);
        expect(summary.lowStockProducts).toEqual([{ name: "Low Stock Item" }]);
        expect(summary.ordersToday).toBe(3);
        expect(summary.revenueToday).toBe(1500);
        expect(summary.newUsersToday).toBe(2);
        expect(summary.totals).toEqual({ totalRevenue: 100000, totalOrders: 50 });
    });

    it("fetches all four data sources in parallel rather than sequentially", async () => {
        mockDashboardRepository.getRecentOrders.mockResolvedValue([]);
        mockDashboardRepository.getLowStockProducts.mockResolvedValue([]);
        mockDashboardRepository.getTodayStats.mockResolvedValue({ ordersToday: 0, revenueToday: 0, newUsersToday: 0 });
        mockDashboardRepository.getTotals.mockResolvedValue({});

        await new DashboardService().getDashboardSummary();

        expect(mockDashboardRepository.getRecentOrders).toHaveBeenCalledWith(10);
        expect(mockDashboardRepository.getLowStockProducts).toHaveBeenCalledWith(10);
    });
});
