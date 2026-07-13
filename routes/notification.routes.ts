import { Router } from "express";
import { NotificationController } from "../controller/notification.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const notificationRouter = Router();
const notificationController = new NotificationController();

notificationRouter.get("/", authorizedMiddleware, notificationController.getMyNotifications);
notificationRouter.get("/unread-count", authorizedMiddleware, notificationController.getUnreadCount);
notificationRouter.patch("/read-all", authorizedMiddleware, notificationController.markAllAsRead);
notificationRouter.patch("/:id/read", authorizedMiddleware, notificationController.markAsRead);

export default notificationRouter;
