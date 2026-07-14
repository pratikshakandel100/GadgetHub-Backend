import Notification, { INotification, NotificationAudience, NotificationType } from "../models/notification.model";

export interface ICreateNotificationData {
    audience: NotificationAudience;
    recipient?: string;
    type: NotificationType;
    title: string;
    message: string;
    order?: string;
    orderNumber?: string;
}

export interface INotificationListResult {
    notifications: INotification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface INotificationRepository {
    create(data: ICreateNotificationData): Promise<INotification>;
    getForAdmin(page: number, limit: number): Promise<INotificationListResult>;
    getForUser(userId: string, page: number, limit: number): Promise<INotificationListResult>;
    countUnreadForAdmin(): Promise<number>;
    countUnreadForUser(userId: string): Promise<number>;
    getById(id: string): Promise<INotification | null>;
    markRead(id: string): Promise<INotification | null>;
    markAllReadForAdmin(): Promise<void>;
    markAllReadForUser(userId: string): Promise<void>;
}

const buildListResult = async (query: Record<string, unknown>, page: number, limit: number): Promise<INotificationListResult> => {
    const skip = (page - 1) * limit;
    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await Notification.countDocuments(query);

    return {
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
};

export class NotificationMongoRepository implements INotificationRepository {
    async create(data: ICreateNotificationData): Promise<INotification> {
        return await Notification.create(data);
    }

    async getForAdmin(page: number, limit: number): Promise<INotificationListResult> {
        return await buildListResult({ audience: "admin" }, page, limit);
    }

    async getForUser(userId: string, page: number, limit: number): Promise<INotificationListResult> {
        return await buildListResult({ audience: "user", recipient: userId }, page, limit);
    }

    async countUnreadForAdmin(): Promise<number> {
        return await Notification.countDocuments({ audience: "admin", read: false });
    }

    async countUnreadForUser(userId: string): Promise<number> {
        return await Notification.countDocuments({ audience: "user", recipient: userId, read: false });
    }

    async getById(id: string): Promise<INotification | null> {
        return await Notification.findById(id);
    }

    async markRead(id: string): Promise<INotification | null> {
        return await Notification.findByIdAndUpdate(id, { $set: { read: true } }, { new: true });
    }

    async markAllReadForAdmin(): Promise<void> {
        await Notification.updateMany({ audience: "admin", read: false }, { $set: { read: true } });
    }

    async markAllReadForUser(userId: string): Promise<void> {
        await Notification.updateMany({ audience: "user", recipient: userId, read: false }, { $set: { read: true } });
    }
}
