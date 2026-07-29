import crypto from "crypto";
import mongoose from "mongoose";
import { OrderMongoRepository, IOrderListResult, IOrderFilters } from "../repositories/order.repository";
import { CartMongoRepository } from "../repositories/cart.repository";
import { ProductMongoRepository } from "../repositories/product.repository";
import { ShippingAddressMongoRepository } from "../repositories/shipping-address.repository";
import { ShippingMethodMongoRepository } from "../repositories/shipping-method.repository";
import { StockMovementMongoRepository } from "../repositories/stock-movement.repository";
import { NotificationService } from "./notification.service";
import { ShippingSettingsService } from "./shipping-settings.service";
import { calculateShipping } from "./shipping-calculation.service";
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
const shippingSettingsService = new ShippingSettingsService();

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
    latitude: address.latitude,
    longitude: address.longitude,
    addressType: address.addressType
});

const TERMINAL_STATUSES: OrderStatus[] = ["Delivered", "Cancelled"];

// Sequential order flow: Pending -> Confirmed (approve) -> Packed -> Shipped
// (ship action, needs delivery person name/phone) -> Delivered (deliver
// action, takes no input — a plain confirmation). Cancellation is a separate
// branch, always requires a reason, available from any non-terminal step.
// Shipped and Delivered are deliberately absent from this map — they always
// go through their own dedicated methods below, never this generic transition.
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
    freeShippingEligible?: boolean;
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
        const allCartItems = cart.items as unknown as IPopulatedCartItem[];
        // productIds lets the customer order only a subset of their cart; omitted means the whole cart.
        const cartItems = orderData.productIds
            ? allCartItems.filter((item) => orderData.productIds!.includes(item.product?._id?.toString()))
            : allCartItems;
        if (cartItems.length === 0) {
            throw new HttpException(400, "None of the selected items were found in your cart");
        }

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

        // An explicit shippingMethodId (legacy path — no longer offered by the
        // checkout UI) always wins if passed; otherwise the distance-based
        // Haversine calculation is authoritative.
        const shippingSettings = shippingMethod ? null : await shippingSettingsService.getSettings();
        const computedShipping = shippingSettings
            ? calculateShipping(
                {
                    destLat: savedAddress.latitude,
                    destLng: savedAddress.longitude,
                    subtotal,
                    freeShippingEligible: cartItems.every((item) => item.product.freeShippingEligible)
                },
                shippingSettings
            )
            : null;

        // Stock is NOT reserved at order creation — only once an admin
        // confirms the order (Pending -> Confirmed, see updateOrderStatus).
        // This is a placed request, not yet a commitment against inventory.
        const shippingFee = shippingMethod?.charge ?? computedShipping!.shippingFee;
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
            distanceFromWarehouseKm: computedShipping ? computedShipping.distanceKm : null,
            warehouseLatitude: shippingSettings?.warehouseLatitude,
            warehouseLongitude: shippingSettings?.warehouseLongitude,
            estimatedDelivery: computedShipping ? computedShipping.estimatedDelivery : shippingMethod?.estimatedDelivery,
            total
        });

        // Partial checkout only removes the ordered items, leaving the rest of the cart intact.
        if (orderData.productIds) {
            for (const item of items) {
                await cartRepository.removeItem(userId, item.product);
            }
        } else {
            await cartRepository.clear(userId);
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

    // Handles Approve (Pending -> Confirmed) and Pack (Confirmed -> Packed) —
    // the two transitions that need no extra data. Shipped, Delivered and
    // Cancelled always go through their own dedicated methods below, since
    // those require a delivery person name/phone, nothing, or a reason respectively.
    async updateOrderStatus(id: string, status: OrderStatus): Promise<IOrder> {
        if (status === "Shipped") {
            throw new HttpException(400, "Use the ship action to mark an order Shipped — the delivery person's name and phone are required");
        }
        if (status === "Delivered") {
            throw new HttpException(400, "Use the deliver action to mark an order Delivered");
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

        // Stock is reserved here, at the moment an admin confirms the order —
        // not at placement — so a cart-checkout that never gets confirmed
        // can't hold inventory hostage. Two customers can now both "place"
        // an order for the last unit; only whichever gets confirmed first wins.
        if (status === "Confirmed") {
            const reservations: { product: string; quantity: number; previousStock: number; newStock: number }[] = [];
            const reserved: { product: string; quantity: number }[] = [];
            try {
                for (const item of existingOrder.items) {
                    const productId = item.product.toString();
                    const updatedProduct = await productRepository.decrementStock(productId, item.quantity);
                    if (!updatedProduct) {
                        throw new HttpException(400, `Insufficient stock for "${item.name}"`);
                    }
                    reserved.push({ product: productId, quantity: item.quantity });
                    const previousStock = updatedProduct.stockQuantity + item.quantity;
                    reservations.push({ product: productId, quantity: item.quantity, previousStock, newStock: updatedProduct.stockQuantity });
                    await notificationService.notifyAdminsLowStockIfCrossed(previousStock, updatedProduct);
                }
            } catch (err) {
                for (const item of reserved) {
                    await productRepository.incrementStock(item.product, item.quantity);
                }
                throw err;
            }

            for (const reservation of reservations) {
                await stockMovementRepository.create({
                    product: reservation.product,
                    type: "order",
                    quantityDelta: -reservation.quantity,
                    previousStock: reservation.previousStock,
                    newStock: reservation.newStock,
                    order: existingOrder._id.toString(),
                    orderNumber: existingOrder.orderNumber
                });
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

    async shipOrder(id: string, deliveryPersonName: string, deliveryPersonPhone: string): Promise<IOrder> {
        const existingOrder = await orderRepository.getById(id);
        if (!existingOrder) {
            throw new HttpException(404, "Order not found");
        }
        if (existingOrder.status !== "Packed") {
            throw new HttpException(400, `Only Packed orders can be shipped (current status: ${existingOrder.status})`);
        }

        const updated = await orderRepository.updateShipment(id, deliveryPersonName, deliveryPersonPhone);
        if (!updated) {
            throw new HttpException(500, "Failed to update order shipment");
        }

        const recipientId = (updated.user as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        await notificationService.notifyUserOrderStatusChanged(updated, recipientId);

        return updated;
    }

    // Deliver takes no input — it's a plain confirmation the order reached
    // the customer. The delivery person's name/phone were already captured
    // back at the Ship step.
    async deliverOrder(id: string): Promise<IOrder> {
        const existingOrder = await orderRepository.getById(id);
        if (!existingOrder) {
            throw new HttpException(404, "Order not found");
        }
        if (existingOrder.status !== "Shipped") {
            throw new HttpException(400, `Only Shipped orders can be marked Delivered (current status: ${existingOrder.status})`);
        }

        const updated = await orderRepository.updateDelivery(id);
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
    // with a reason. Stock is always reserved at order creation, so cancelling
    // always restocks.
    async cancelOrder(id: string, reason: string): Promise<IOrder> {
        const existingOrder = await orderRepository.getById(id);
        if (!existingOrder) {
            throw new HttpException(404, "Order not found");
        }
        if (TERMINAL_STATUSES.includes(existingOrder.status)) {
            throw new HttpException(400, `Order is already ${existingOrder.status} and cannot be cancelled`);
        }

        // Stock is only reserved once an order reaches Confirmed (see
        // updateOrderStatus) — cancelling while still Pending never touched
        // inventory, so there's nothing to give back.
        if (existingOrder.status !== "Pending") {
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

}
