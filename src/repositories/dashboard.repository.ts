import Order, { IOrder } from "../models/order.model";
import Product, { IProduct } from "../models/product.model";
import User from "../models/user.model";

export interface IDashboardSummaryStats {
    ordersToday: number;
    revenueToday: number;
    newUsersToday: number;
}

export interface IDashboardTotals {
    totalProducts: number;
    productsAddedThisWeek: number;
    totalUsers: number;
    usersAddedThisMonth: number;
    totalOrders: number;
    ordersThisMonth: number;
    totalRevenue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    pendingOrders: number;
    pendingOrdersLast24h: number;
}

export interface IDashboardRepository {
    getRecentOrders(limit: number): Promise<IOrder[]>;
    getLowStockProducts(limit: number): Promise<IProduct[]>;
    getTodayStats(startOfDay: Date): Promise<IDashboardSummaryStats>;
    getTotals(startOfWeek: Date, startOfMonth: Date, startOfLastMonth: Date, last24h: Date): Promise<IDashboardTotals>;
}

const USER_POPULATE = { path: "user", select: "fullname email" };

export class DashboardMongoRepository implements IDashboardRepository {
    async getRecentOrders(limit: number): Promise<IOrder[]> {
        return await Order.find()
            .populate(USER_POPULATE)
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    async getLowStockProducts(limit: number): Promise<IProduct[]> {
        return await Product.find({
            status: "Published",
            $expr: { $lte: ["$stockQuantity", "$minimumStockAlert"] }
        })
            .select("name sku stockQuantity minimumStockAlert availability mainImage")
            .sort({ stockQuantity: 1 })
            .limit(limit);
    }

    async getTodayStats(startOfDay: Date): Promise<IDashboardSummaryStats> {
        const [ordersToday, newUsersToday, revenueResult] = await Promise.all([
            Order.countDocuments({ createdAt: { $gte: startOfDay } }),
            User.countDocuments({ role: "user", createdAt: { $gte: startOfDay } }),
            Order.aggregate([
                { $match: { createdAt: { $gte: startOfDay }, status: { $ne: "Cancelled" } } },
                { $group: { _id: null, revenue: { $sum: "$total" } } }
            ])
        ]);

        return {
            ordersToday,
            newUsersToday,
            revenueToday: revenueResult[0]?.revenue || 0
        };
    }

    async getTotals(startOfWeek: Date, startOfMonth: Date, startOfLastMonth: Date, last24h: Date): Promise<IDashboardTotals> {
        const [
            totalProducts,
            productsAddedThisWeek,
            totalUsers,
            usersAddedThisMonth,
            totalOrders,
            ordersThisMonth,
            totalRevenueResult,
            revenueThisMonthResult,
            revenueLastMonthResult,
            pendingOrders,
            pendingOrdersLast24h
        ] = await Promise.all([
            Product.countDocuments(),
            Product.countDocuments({ createdAt: { $gte: startOfWeek } }),
            User.countDocuments({ role: "user" }),
            User.countDocuments({ role: "user", createdAt: { $gte: startOfMonth } }),
            Order.countDocuments(),
            Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Order.aggregate([
                { $match: { status: { $ne: "Cancelled" } } },
                { $group: { _id: null, revenue: { $sum: "$total" } } }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: "Cancelled" } } },
                { $group: { _id: null, revenue: { $sum: "$total" } } }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }, status: { $ne: "Cancelled" } } },
                { $group: { _id: null, revenue: { $sum: "$total" } } }
            ]),
            Order.countDocuments({ status: "Pending" }),
            Order.countDocuments({ status: "Pending", createdAt: { $gte: last24h } })
        ]);

        return {
            totalProducts,
            productsAddedThisWeek,
            totalUsers,
            usersAddedThisMonth,
            totalOrders,
            ordersThisMonth,
            totalRevenue: totalRevenueResult[0]?.revenue || 0,
            revenueThisMonth: revenueThisMonthResult[0]?.revenue || 0,
            revenueLastMonth: revenueLastMonthResult[0]?.revenue || 0,
            pendingOrders,
            pendingOrdersLast24h
        };
    }
}
