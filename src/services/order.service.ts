import crypto from "crypto";
import mongoose from "mongoose";
import { OrderMongoRepository, IOrderListResult, IOrderFilters } from "../repositories/order.repository";
import { CartMongoRepository } from "../repositories/cart.repository";
import { ProductMongoRepository } from "../repositories/product.repository";
import { ShippingAddressMongoRepository } from "../repositories/shipping-address.repository";
import { ShippingMethodMongoRepository } from "../repositories/shipping-method.repository";
import { StockMovementMongoRepository } from "../repositories/stock-movement.repository";
import { NotificationService } from "./notification.service";
import { CreateOrderDTO } from "../dtos/order.dto";
import { IOrder, IShippingAddress, OrderStatus } from "../models/order.model";
import { IShippingAddress as ISavedShippingAddress } from "../models/shipping-address.model";
import { HttpException } from "../exceptions/http-exception";
import { SortOrder } from "../utils/query.util";

const orderRepository = new OrderMongoRepository();
const cartRepository = new CartMongoRepository();
const productRepository = new ProductMongoRepository();
const shippingAddressRepository = new ShippingAddressMongoRepository();
const shippingMethodRepository = new ShippingMethodMongoRepository();
const stockMovementRepository = new StockMovementMongoRepository();
const notificationService = new NotificationService();

// Copies only the physical-address fields onto the order — bookkeeping
// fields like isDefault belong to the address book, not the snapshot —
// so later edits/deletes of the saved address never affect past orders.
const snapshotShippingAddress = (address: ISavedShippingAddress): IShippingAddress => ({
    fullName: address.fullName,
    phoneNumber: address.phoneNumber,
    province: address.province,
    district: address.district,
    municipality: address.municipality,
    wardNumber: address.wardNumber,
    street: address.street,
    landmark: address.landmark,
    addressType: address.addressType
});

const TERMINAL_STATUSES: OrderStatus[] = ["Delivered", "Cancelled"];

// Sequential order flow: Pending -> Confirmed (approve) -> Packed -> Shipped
// (ship action, needs courier/tracking) -> Delivered (deliver action, needs
// delivery person name/phone). Cancellation is a separate branch, always
// requires a reason, available from any non-terminal step. Shipped and
// Delivered are deliberately absent from this map — they always go through
// their own dedicated methods below, never this generic transition.
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    Pending: "Confirmed",
    Confirmed: "Packed"
};

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
        const savedAddress = await shippingAddressRepository.getById(orderData.shippingAddressId);
        if (!savedAddress || savedAddress.user.toString() !== userId) {
            throw new HttpException(404, "Shipping address not found");
        }

        // Shipping method selection was removed from checkout — orders ship
        // free unless a shippingMethodId is explicitly passed (e.g. by an
        // older client or a future re-introduction of the picker).
        const shippingMethod = orderData.shippingMethodId
            ? await shippingMethodRepository.getById(orderData.shippingMethodId)
            : null;
        if (orderData.shippingMethodId && (!shippingMethod || !shippingMethod.isActive)) {
            throw new HttpException(404, "Shipping method not found");
        }

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

        if (shippingMethod?.minOrderAmount && subtotal < shippingMethod.minOrderAmount) {
            throw new HttpException(400, `"${shippingMethod.name}" requires a minimum order of Rs. ${shippingMethod.minOrderAmount.toLocaleString()}`);
        }

        // Cash on delivery reserves stock immediately, same as before. Online
        // payments defer the decrement until PaymentService confirms the
        // eSewa transaction actually completed, so an abandoned/failed
        // payment never removes stock for a purchase that didn't happen.
        const codReservations: { product: string; quantity: number; previousStock: number; newStock: number }[] = [];
        if (orderData.paymentMethod === "cod") {
            const reserved: { product: string; quantity: number }[] = [];
            try {
                for (const item of items) {
                    const updated = await productRepository.decrementStock(item.product, item.quantity);
                    if (!updated) {
                        throw new HttpException(400, `Insufficient stock for "${item.name}"`);
                    }
                    reserved.push({ product: item.product, quantity: item.quantity });
                    const previousStock = updated.stockQuantity + item.quantity;
                    codReservations.push({ product: item.product, quantity: item.quantity, previousStock, newStock: updated.stockQuantity });
                    await notificationService.notifyAdminsLowStockIfCrossed(previousStock, updated);
                }
            } catch (err) {
                for (const item of reserved) {
                    await productRepository.incrementStock(item.product, item.quantity);
                }
                throw err;
            }
        }

        const shippingFee = shippingMethod?.charge ?? 0;
        const total = subtotal + shippingFee;
        const orderNumber = await generateOrderNumber();

        const order = await orderRepository.create({
            orderNumber,
            user: userId,
            items,
            shippingAddress: snapshotShippingAddress(savedAddress),
            shippingMethod: shippingMethod ? { name: shippingMethod.name, estimatedDelivery: shippingMethod.estimatedDelivery } : undefined,
            paymentMethod: orderData.paymentMethod,
            paymentStatus: "Pending",
            amount: total,
            currency: "NPR",
            subtotal,
            shippingFee,
            total
        });

        await cartRepository.clear(userId);

        for (const reservation of codReservations) {
            await stockMovementRepository.create({
                product: reservation.product,
                type: "order",
                quantityDelta: -reservation.quantity,
                previousStock: reservation.previousStock,
                newStock: reservation.newStock,
                order: order._id.toString(),
                orderNumber: order.orderNumber
            });
        }

        await notificationService.notifyAdminsOrderPlaced(order);

        return order;
    }

    async getUserOrders(userId: string, page: number, limit: number, status: string, sort: Record<string, SortOrder>): Promise<IOrderListResult> {
        return await orderRepository.getByUser(userId, page, limit, status, sort);
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

    async getAllOrders(page: number, limit: number, status: string, search: string, sort: Record<string, SortOrder>, filters?: IOrderFilters): Promise<IOrderListResult> {
        return await orderRepository.getAll(page, limit, status, search, sort, filters);
    }

    // Handles Approve (Pending -> Confirmed), Pack (Confirmed -> Packed), and
    // Deliver (Shipped -> Delivered) — the three transitions that need no
    // extra data. Shipped and Cancelled always go through their own methods
    // below, since those require courier/tracking or a reason respectively.
    async updateOrderStatus(id: string, status: OrderStatus): Promise<IOrder> {
        if (status === "Shipped") {
            throw new HttpException(400, "Use the ship action to mark an order Shipped — courier and tracking number are required");
        }
        if (status === "Delivered") {
            throw new HttpException(400, "Use the deliver action to mark an order Delivered — the delivery person's name and phone are required");
        }
        if (status === "Cancelled") {
            throw new HttpException(400, "Use the cancel action to cancel an order — a reason is required");
        }

        const existingOrder = await orderRepository.getById(id);
        if (!existingOrder) {
            throw new HttpException(404, "Order not found");
        }
        if (TERMINAL_STATUSES.includes(existingOrder.status)) {
            throw new HttpException(400, `Order is already ${existingOrder.status} and cannot be updated further`);
        }

        const expectedNext = NEXT_STATUS[existingOrder.status];
        if (status !== expectedNext) {
            throw new HttpException(400, `Order must move from "${existingOrder.status}" to "${expectedNext}" next`);
        }

        const updated = await orderRepository.updateStatus(id, status);
        if (!updated) {
            throw new HttpException(500, "Failed to update order status");
        }

        const recipientId = (updated.user as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        await notificationService.notifyUserOrderStatusChanged(updated, recipientId);

        return updated;
    }

    async shipOrder(id: string, courier: string, trackingNumber: string): Promise<IOrder> {
        const existingOrder = await orderRepository.getById(id);
        if (!existingOrder) {
            throw new HttpException(404, "Order not found");
        }
        if (existingOrder.status !== "Packed") {
            throw new HttpException(400, `Only Packed orders can be shipped (current status: ${existingOrder.status})`);
        }

        const updated = await orderRepository.updateShipment(id, courier, trackingNumber);
        if (!updated) {
            throw new HttpException(500, "Failed to update order shipment");
        }

        const recipientId = (updated.user as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        await notificationService.notifyUserOrderStatusChanged(updated, recipientId);

        return updated;
    }

    async deliverOrder(id: string, deliveryPersonName: string, deliveryPersonPhone: string): Promise<IOrder> {
        const existingOrder = await orderRepository.getById(id);
        if (!existingOrder) {
            throw new HttpException(404, "Order not found");
        }
        if (existingOrder.status !== "Shipped") {
            throw new HttpException(400, `Only Shipped orders can be marked Delivered (current status: ${existingOrder.status})`);
        }

        const updated = await orderRepository.updateDelivery(id, deliveryPersonName, deliveryPersonPhone);
        if (!updated) {
            throw new HttpException(500, "Failed to update order delivery");
        }

        // Drives the Best Seller badge — counted only for units that actually
        // reached the customer, not just placed/paid (see soldQuantity above).
        for (const item of existingOrder.items) {
            await productRepository.incrementDeliveredQuantity(item.product.toString(), item.quantity);
        }

        const recipientId = (updated.user as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        await notificationService.notifyUserOrderStatusChanged(updated, recipientId);

        return updated;
    }

    // Covers both "Reject" (from Pending, in the admin UI) and "Cancel Order"
    // (from Confirmed/Packed/Shipped) — same underlying transition, always
    // with a reason. Only restocks if stock was actually reserved for this
    // order: COD orders reserve at creation; online orders only reserve once
    // payment is confirmed (see markOrderPaid), so a still-Pending-payment
    // online order cancelled before paying never touched stock to begin with.
    async cancelOrder(id: string, reason: string): Promise<IOrder> {
        const existingOrder = await orderRepository.getById(id);
        if (!existingOrder) {
            throw new HttpException(404, "Order not found");
        }
        if (TERMINAL_STATUSES.includes(existingOrder.status)) {
            throw new HttpException(400, `Order is already ${existingOrder.status} and cannot be cancelled`);
        }

        if (existingOrder.paymentMethod === "cod" || existingOrder.paymentStatus === "Paid") {
            for (const item of existingOrder.items) {
                const updated = await productRepository.incrementStock(item.product.toString(), item.quantity);
                if (updated) {
                    await stockMovementRepository.create({
                        product: item.product.toString(),
                        type: "order",
                        quantityDelta: item.quantity,
                        previousStock: updated.stockQuantity - item.quantity,
                        newStock: updated.stockQuantity,
                        order: existingOrder._id.toString(),
                        orderNumber: existingOrder.orderNumber
                    });
                }
            }
        }

        const updated = await orderRepository.updateCancellation(id, reason);
        if (!updated) {
            throw new HttpException(500, "Failed to cancel order");
        }

        const recipientId = (updated.user as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        await notificationService.notifyUserOrderStatusChanged(updated, recipientId);

        return updated;
    }

    async getOrderByReferenceId(referenceId: string): Promise<IOrder | null> {
        return await orderRepository.getByReferenceId(referenceId);
    }

    async markOrderPaid(orderId: string, transactionId: string): Promise<IOrder> {
        const order = await orderRepository.getById(orderId);
        if (!order) {
            throw new HttpException(404, "Order not found");
        }
        if (order.paymentStatus === "Paid") {
            return order;
        }

        // Stock is reserved here, on confirmed payment, rather than at order
        // creation — see createOrder. Money is already captured by eSewa at
        // this point, so a failed decrement (rare — stock ran out in the
        // meantime) is logged rather than rolling the payment back.
        for (const item of order.items) {
            const updated = await productRepository.decrementStock(item.product.toString(), item.quantity);
            if (!updated) {
                console.error(`Insufficient stock to reserve product ${item.product} for paid order ${order.orderNumber}`);
                continue;
            }
            const previousStock = updated.stockQuantity + item.quantity;
            await stockMovementRepository.create({
                product: item.product.toString(),
                type: "order",
                quantityDelta: -item.quantity,
                previousStock,
                newStock: updated.stockQuantity,
                order: order._id.toString(),
                orderNumber: order.orderNumber
            });
            await notificationService.notifyAdminsLowStockIfCrossed(previousStock, updated);
        }

        const updated = await orderRepository.updatePayment(orderId, {
            paymentStatus: "Paid",
            transactionId,
            paidAt: new Date()
        });
        if (!updated) {
            throw new HttpException(500, "Failed to update order payment status");
        }
        return updated;
    }

    async markOrderPaymentFailed(orderId: string): Promise<IOrder | null> {
        const order = await orderRepository.getById(orderId);
        if (!order || order.paymentStatus === "Paid") {
            return order;
        }
        return await orderRepository.updatePayment(orderId, { paymentStatus: "Failed" });
    }
}
