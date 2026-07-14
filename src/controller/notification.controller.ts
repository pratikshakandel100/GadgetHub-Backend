import { ApiResponseHelper } from "../utils/apihelper.util";
import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";

const notificationService = new NotificationService();

export class NotificationController {
    async getMyNotifications(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const isAdmin = req.user?.role === "admin";

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;

            const result = await notificationService.getMyNotifications(userId, isAdmin, page, limit);

            return ApiResponseHelper.success(res, result.notifications, "Notifications fetched successfully", 200, {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages
            });
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getUnreadCount(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const isAdmin = req.user?.role === "admin";

            const count = await notificationService.getUnreadCount(userId, isAdmin);
            return ApiResponseHelper.success(res, { count }, "Unread count fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async markAsRead(req: Request<{ id: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const isAdmin = req.user?.role === "admin";

            const notification = await notificationService.markAsRead(req.params.id, userId, isAdmin);
            return ApiResponseHelper.success(res, notification, "Notification marked as read");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async markAllAsRead(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const isAdmin = req.user?.role === "admin";

            await notificationService.markAllAsRead(userId, isAdmin);
            return ApiResponseHelper.success(res, {}, "All notifications marked as read");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
