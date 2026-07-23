import { Router } from "express";
import { OrderController } from "../controller/order.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const orderRouter = Router();
const orderController = new OrderController();

orderRouter.post("/", authorizedMiddleware, orderController.createOrder);
orderRouter.get("/", authorizedMiddleware, orderController.getMyOrders);
orderRouter.get("/admin/all", authorizedMiddleware, adminMiddleware, orderController.getAllOrders);
orderRouter.get("/:id", authorizedMiddleware, orderController.getOrderById);
orderRouter.get("/:id/invoice", authorizedMiddleware, orderController.downloadInvoice);
orderRouter.patch("/:id/status", authorizedMiddleware, adminMiddleware, orderController.updateOrderStatus);
orderRouter.patch("/:id/ship", authorizedMiddleware, adminMiddleware, orderController.shipOrder);
orderRouter.patch("/:id/deliver", authorizedMiddleware, adminMiddleware, orderController.deliverOrder);
orderRouter.patch("/:id/cancel", authorizedMiddleware, adminMiddleware, orderController.cancelOrder);

export default orderRouter;
