import Order, { IOrder, OrderStatus } from "../models/order.model";
import User from "../models/user.model";
import { CreateOrderDTO } from "../dtos/order.dto";

export interface IOrderListResult {
    orders: IOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ICreateOrderData {
    orderNumber: string;
    user: string;
    items: {
        product: string;
        name: string;
        sku?: string;
        image?: string;
        price: number;
        quantity: number;
    }[];
    shippingAddress: CreateOrderDTO["shippingAddress"];
    paymentMethod: "cod" | "online";
    subtotal: number;
    shippingFee: number;
    total: number;
}

export interface IOrderFilters {
    dateFrom?: string;
    dateTo?: string;
    paymentMethod?: string;
}

export interface IOrderRepository {
    create(data: ICreateOrderData): Promise<IOrder>;
    getById(id: string): Promise<IOrder | null>;
    getByUser(userId: string, page: number, limit: number, status: string): Promise<IOrderListResult>;
    getAll(page: number, limit: number, status: string, search: string, filters?: IOrderFilters): Promise<IOrderListResult>;
    updateStatus(id: string, status: OrderStatus): Promise<IOrder | null>;
    updateShipment(id: string, courier: string, trackingNumber: string): Promise<IOrder | null>;
    updateCancellation(id: string, reason: string): Promise<IOrder | null>;
    existsByOrderNumber(orderNumber: string): Promise<boolean>;
}

const USER_POPULATE = { path: "user", select: "fullname email" };

export class OrderMongoRepository implements IOrderRepository {
    async create(data: ICreateOrderData): Promise<IOrder> {
        const created = await Order.create({
            ...data,
            status: "Pending",
            statusHistory: [{ status: "Pending", changedAt: new Date() }]
        });
        return created.populate(USER_POPULATE);
    }

    async getById(id: string): Promise<IOrder | null> {
        return await Order.findById(id).populate(USER_POPULATE);
    }

    async getByUser(userId: string, page: number, limit: number, status: string): Promise<IOrderListResult> {
        const query: any = { user: userId };
        if (status) query.status = status;

        const skip = (page - 1) * limit;
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments(query);

        return {
            orders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getAll(page: number, limit: number, status: string, search: string, filters: IOrderFilters = {}): Promise<IOrderListResult> {
        const query: any = {};
        if (status) query.status = status;
        if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
        if (filters.dateFrom || filters.dateTo) {
            query.createdAt = {};
            if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
            if (filters.dateTo) {
                // Treat dateTo as inclusive of the whole day.
                const endOfDay = new Date(filters.dateTo);
                endOfDay.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endOfDay;
            }
        }
        if (search) {
            // Order number and shipping-address name live on the order itself;
            // customer name/email live on the linked User, so those need a
            // separate lookup first to fold into the same $or.
            const matchingUsers = await User.find({
                $or: [
                    { fullname: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } }
                ]
            }).select("_id");

            query.$or = [
                { orderNumber: { $regex: search, $options: "i" } },
                { "shippingAddress.fullName": { $regex: search, $options: "i" } },
                { user: { $in: matchingUsers.map((u) => u._id) } }
            ];
        }

        const skip = (page - 1) * limit;
        const orders = await Order.find(query)
            .populate(USER_POPULATE)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments(query);

        return {
            orders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async updateStatus(id: string, status: OrderStatus): Promise<IOrder | null> {
        return await Order.findByIdAndUpdate(
            id,
            {
                $set: { status },
                $push: { statusHistory: { status, changedAt: new Date() } }
            },
            { new: true, runValidators: true }
        ).populate(USER_POPULATE);
    }

    async updateShipment(id: string, courier: string, trackingNumber: string): Promise<IOrder | null> {
        return await Order.findByIdAndUpdate(
            id,
            {
                $set: { status: "Shipped", courier, trackingNumber },
                $push: { statusHistory: { status: "Shipped", changedAt: new Date() } }
            },
            { new: true, runValidators: true }
        ).populate(USER_POPULATE);
    }

    async updateCancellation(id: string, reason: string): Promise<IOrder | null> {
        return await Order.findByIdAndUpdate(
            id,
            {
                $set: { status: "Cancelled", cancelReason: reason },
                $push: { statusHistory: { status: "Cancelled", changedAt: new Date() } }
            },
            { new: true, runValidators: true }
        ).populate(USER_POPULATE);
    }

    async existsByOrderNumber(orderNumber: string): Promise<boolean> {
        const found = await Order.exists({ orderNumber });
        return !!found;
    }
}
