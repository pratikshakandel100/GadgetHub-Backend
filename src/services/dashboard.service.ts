import { DashboardMongoRepository } from "../repositories/dashboard.repository";

const RECENT_ORDERS_LIMIT = 10;
const LOW_STOCK_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const dashboardRepository = new DashboardMongoRepository();

const startOfToday = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const startOfMonth = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
};

const startOfLastMonth = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
};

export class DashboardService {
    async getDashboardSummary() {
        const now = new Date();
        const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
        const last24h = new Date(now.getTime() - DAY_MS);

        const [recentOrders, lowStockProducts, todayStats, totals] = await Promise.all([
            dashboardRepository.getRecentOrders(RECENT_ORDERS_LIMIT),
            dashboardRepository.getLowStockProducts(LOW_STOCK_LIMIT),
            dashboardRepository.getTodayStats(startOfToday()),
            dashboardRepository.getTotals(startOfWeek, startOfMonth(), startOfLastMonth(), last24h)
        ]);

        return {
            recentOrders,
            lowStockProducts,
            ordersToday: todayStats.ordersToday,
            revenueToday: todayStats.revenueToday,
            newUsersToday: todayStats.newUsersToday,
            totals
        };
    }
}
