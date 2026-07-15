import Order, { IOrder, OrderStatus } from "../models/order.model";
import { CreateOrderDTO } from "../dtos/order.dto";
import { buildPaginationMeta, SortOrder } from "../utils/query.util";

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

export interface IOrderRepository {
    create(data: ICreateOrderData): Promise<IOrder>;
    getById(id: string): Promise<IOrder | null>;
    getByUser(userId: string, page: number, limit: number, status: string, sort: Record<string, SortOrder>): Promise<IOrderListResult>;
    getAll(page: number, limit: number, status: string, search: string, sort: Record<string, SortOrder>): Promise<IOrderListResult>;
    updateStatus(id: string, status: OrderStatus): Promise<IOrder | null>;
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

    async getByUser(userId: string, page: number, limit: number, status: string, sort: Record<string, SortOrder>): Promise<IOrderListResult> {
        const query: any = { user: userId };
        if (status) query.status = status;

        const skip = (page - 1) * limit;
        const orders = await Order.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments(query);

        return { orders, ...buildPaginationMeta(total, page, limit) };
    }

    async getAll(page: number, limit: number, status: string, search: string, sort: Record<string, SortOrder>): Promise<IOrderListResult> {
        const query: any = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: "i" } },
                { "shippingAddress.fullName": { $regex: search, $options: "i" } }
            ];
        }

        const skip = (page - 1) * limit;
        const orders = await Order.find(query)
            .populate(USER_POPULATE)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments(query);

        return { orders, ...buildPaginationMeta(total, page, limit) };
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

    async existsByOrderNumber(orderNumber: string): Promise<boolean> {
        const found = await Order.exists({ orderNumber });
        return !!found;
    }
}
