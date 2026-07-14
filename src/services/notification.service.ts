import { NotificationMongoRepository, INotificationListResult } from "../repositories/notification.repository";
import { INotification } from "../models/notification.model";
import { IOrder } from "../models/order.model";
import { HttpException } from "../exceptions/http-exception";

const notificationRepository = new NotificationMongoRepository();

export class NotificationService {
    async notifyAdminsOrderPlaced(order: IOrder): Promise<void> {
        await notificationRepository.create({
            audience: "admin",
            type: "order_placed",
            title: "New order placed",
            message: `${order.shippingAddress.fullName} placed order ${order.orderNumber} for $${order.total.toLocaleString()}`,
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
