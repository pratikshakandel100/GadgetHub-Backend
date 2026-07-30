import { NotificationMongoRepository, INotificationListResult } from "../repositories/notification.repository";
import { INotification } from "../models/notification.model";
import { IOrder } from "../models/order.model";
import { IProduct } from "../models/product.model";
import { HttpException } from "../exceptions/http-exception";

const notificationRepository = new NotificationMongoRepository();

export class NotificationService {
    async notifyAdminsOrderPlaced(order: IOrder): Promise<void> {
        await notificationRepository.create({
            audience: "admin",
            type: "order_placed",
            title: "New order placed",
            message: `${order.shippingAddress.fullName} placed order ${order.orderNumber} for Rs. ${order.total.toLocaleString()}`,
            order: order._id.toString(),
            orderNumber: order.orderNumber
        });
    }

    async notifyUserOrderStatusChanged(order: IOrder, userId: string): Promise<void> {
        await notificationRepository.create({
            audience: "user",
            recipient: userId,
            type: "order_status_changed",
            title: "Order status updated",
            message: `Your order ${order.orderNumber} is now ${order.status}`,
            order: order._id.toString(),
            orderNumber: order.orderNumber
        });
    }

    async notifyAdminsLowStock(product: IProduct): Promise<void> {
        await notificationRepository.create({
            audience: "admin",
            type: "low_stock",
            title: product.stockQuantity === 0 ? "Product out of stock" : "Low stock alert",
            message: `${product.name} has ${product.stockQuantity} unit${product.stockQuantity === 1 ? "" : "s"} left (minimum alert: ${product.minimumStockAlert})`,
            product: product._id.toString(),
            productName: product.name
        });
    }

    // Fires only on the transition into low/out-of-stock territory, not on every
    // decrement while already below the threshold — otherwise every subsequent
    // sale of a slow-restocked product would spam a fresh notification.
    async notifyAdminsLowStockIfCrossed(previousStock: number, product: IProduct): Promise<void> {
        if (product.stockQuantity <= product.minimumStockAlert && previousStock > product.minimumStockAlert) {
            await this.notifyAdminsLowStock(product);
        }
    }

    async getMyNotifications(userId: string, isAdmin: boolean, page: number, limit: number): Promise<INotificationListResult> {
        return isAdmin
            ? await notificationRepository.getForAdmin(page, limit)
            : await notificationRepository.getForUser(userId, page, limit);
    }

    async getUnreadCount(userId: string, isAdmin: boolean): Promise<number> {
        return isAdmin
            ? await notificationRepository.countUnreadForAdmin()
            : await notificationRepository.countUnreadForUser(userId);
    }

    async markAsRead(id: string, userId: string, isAdmin: boolean): Promise<INotification> {
        const notification = await notificationRepository.getById(id);
        if (!notification) {
            throw new HttpException(404, "Notification not found");
        }

        const isOwnedByCaller = isAdmin
            ? notification.audience === "admin"
            : notification.audience === "user" && notification.recipient?.toString() === userId;

        if (!isOwnedByCaller) {
            throw new HttpException(404, "Notification not found");
        }

        const updated = await notificationRepository.markRead(id);
        if (!updated) {
            throw new HttpException(500, "Failed to update notification");
        }
        return updated;
    }

    async markAllAsRead(userId: string, isAdmin: boolean): Promise<void> {
        if (isAdmin) {
            await notificationRepository.markAllReadForAdmin();
        } else {
            await notificationRepository.markAllReadForUser(userId);
        }
    }
}
