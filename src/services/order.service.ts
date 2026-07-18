import crypto from "crypto";
import mongoose from "mongoose";
import { OrderMongoRepository, IOrderListResult } from "../repositories/order.repository";
import { CartMongoRepository } from "../repositories/cart.repository";
import { ProductMongoRepository } from "../repositories/product.repository";
import { NotificationService } from "./notification.service";
import { CreateOrderDTO } from "../dtos/order.dto";
import { IOrder, OrderStatus } from "../models/order.model";
import { HttpException } from "../exceptions/http-exception";

const orderRepository = new OrderMongoRepository();
const cartRepository = new CartMongoRepository();
const productRepository = new ProductMongoRepository();
const notificationService = new NotificationService();

const TERMINAL_STATUSES: OrderStatus[] = ["Delivered", "Cancelled"];
const SHIPPING_FREE_THRESHOLD = 500;
const SHIPPING_FEE = 15;

interface IPopulatedCartProduct {
    _id: mongoose.Types.ObjectId;
    name: string;
    sku?: string;
    sellingPrice: number;
    mainImage?: string;
    stockQuantity: number;
    availability: string;
    status: string;
}

interface IPopulatedCartItem {
    product: IPopulatedCartProduct;
    quantity: number;
}

const generateOrderNumber = async (): Promise<string> => {
    let orderNumber: string;
    let exists = true;
    do {
        orderNumber = `ORD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        exists = await orderRepository.existsByOrderNumber(orderNumber);
    } while (exists);
    return orderNumber;
};

export class OrderService {
    async createOrder(userId: string, orderData: CreateOrderDTO): Promise<IOrder> {
        const cart = await cartRepository.findByUser(userId);
        if (!cart || cart.items.length === 0) {
            throw new HttpException(400, "Your cart is empty");
        }

        const items = [];
        let subtotal = 0;
        const cartItems = cart.items as unknown as IPopulatedCartItem[];

        for (const cartItem of cartItems) {
            const product = cartItem.product;
            if (!product) {
                throw new HttpException(404, `A product in your cart is no longer available`);
            }
            if (product.status !== "Published") {
                throw new HttpException(400, `"${product.name}" is no longer available for purchase`);
            }
            if (product.stockQuantity < cartItem.quantity) {
                throw new HttpException(400, `Insufficient stock for "${product.name}"`);
            }

            items.push({
                product: product._id.toString(),
                name: product.name,
                sku: product.sku,
                image: product.mainImage,
                price: product.sellingPrice,
                quantity: cartItem.quantity
            });
            subtotal += product.sellingPrice * cartItem.quantity;
        }

        // Reserve stock atomically before the order exists in the DB. If a
        // concurrent checkout already claimed the last units, decrementStock
        // returns null here (its own filter re-checks stock), so we back out
        // any items already reserved for this order instead of leaving it
        // half-decremented.
        const reserved: { product: string; quantity: number }[] = [];
        try {
            for (const item of items) {
                const updated = await productRepository.decrementStock(item.product, item.quantity);
                if (!updated) {
                    throw new HttpException(400, `Insufficient stock for "${item.name}"`);
                }
                reserved.push({ product: item.product, quantity: item.quantity });
            }
        } catch (err) {
            for (const item of reserved) {
                await productRepository.incrementStock(item.product, item.quantity);
            }
            throw err;
        }

        const shippingFee = subtotal > SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FEE;
        const total = subtotal + shippingFee;
        const orderNumber = await generateOrderNumber();

        const order = await orderRepository.create({
            orderNumber,
            user: userId,
            items,
            shippingAddress: orderData.shippingAddress,
            paymentMethod: orderData.paymentMethod,
            subtotal,
            shippingFee,
            total
        });

        await cartRepository.clear(userId);

        await notificationService.notifyAdminsOrderPlaced(order);

        return order;
    }

    async getUserOrders(userId: string, page: number, limit: number, status: string): Promise<IOrderListResult> {
        return await orderRepository.getByUser(userId, page, limit, status);
    }

    async getOrderById(id: string, userId: string, isAdmin: boolean): Promise<IOrder> {
        const order = await orderRepository.getById(id);
        if (!order) {
            throw new HttpException(404, "Order not found");
        }
        const orderUserId = (order.user as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        if (!isAdmin && orderUserId !== userId) {
            throw new HttpException(404, "Order not found");
        }
        return order;
    }

    async getAllOrders(page: number, limit: number, status: string, search: string): Promise<IOrderListResult> {
        return await orderRepository.getAll(page, limit, status, search);
    }

    async updateOrderStatus(id: string, status: OrderStatus): Promise<IOrder> {
        const existingOrder = await orderRepository.getById(id);
        if (!existingOrder) {
            throw new HttpException(404, "Order not found");
        }
        if (TERMINAL_STATUSES.includes(existingOrder.status)) {
            throw new HttpException(400, `Order is already ${existingOrder.status} and cannot be updated further`);
        }

        if (status === "Cancelled") {
            for (const item of existingOrder.items) {
                await productRepository.incrementStock(item.product.toString(), item.quantity);
            }
        }

        const updated = await orderRepository.updateStatus(id, status);
        if (!updated) {
            throw new HttpException(500, "Failed to update order status");
        }

        const recipientId = (updated.user as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        await notificationService.notifyUserOrderStatusChanged(updated, recipientId);

        return updated;
    }
}
