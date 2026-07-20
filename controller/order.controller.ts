import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { OrderService } from "../services/order.service";
import { CreateOrderDTO, UpdateOrderStatusDTO, CancelOrderDTO, ShipOrderDTO } from "../dtos/order.dto";

const orderService = new OrderService();

export class OrderController {
    async createOrder(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const orderData = CreateOrderDTO.safeParse(req.body);
            if (!orderData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(orderData.error), 400);
            }

            const order = await orderService.createOrder(userId, orderData.data);
            return ApiResponseHelper.success(res, order, "Order placed successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getMyOrders(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const status = (req.query.status as string) || "";

            const result = await orderService.getUserOrders(userId, page, limit, status);

            return ApiResponseHelper.success(res, result.orders, "Orders fetched successfully", 200, {
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

    async getAllOrders(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const status = (req.query.status as string) || "";
            const search = (req.query.search as string) || "";
            const dateFrom = (req.query.dateFrom as string) || undefined;
            const dateTo = (req.query.dateTo as string) || undefined;
            const paymentMethod = (req.query.paymentMethod as string) || undefined;

            const result = await orderService.getAllOrders(page, limit, status, search, { dateFrom, dateTo, paymentMethod });

            return ApiResponseHelper.success(res, result.orders, "Orders fetched successfully", 200, {
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

    async getOrderById(req: Request<{ id: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const isAdmin = req.user?.role === "admin";

            const order = await orderService.getOrderById(req.params.id, userId, isAdmin);
            return ApiResponseHelper.success(res, order, "Order fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async updateOrderStatus(req: Request<{ id: string }>, res: Response) {
        try {
            const statusData = UpdateOrderStatusDTO.safeParse(req.body);
            if (!statusData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(statusData.error), 400);
            }

            const order = await orderService.updateOrderStatus(req.params.id, statusData.data.status);
            return ApiResponseHelper.success(res, order, "Order status updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async shipOrder(req: Request<{ id: string }>, res: Response) {
        try {
            const shipData = ShipOrderDTO.safeParse(req.body);
            if (!shipData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(shipData.error), 400);
            }

            const order = await orderService.shipOrder(req.params.id, shipData.data.courier, shipData.data.trackingNumber);
            return ApiResponseHelper.success(res, order, "Order marked as shipped");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async cancelOrder(req: Request<{ id: string }>, res: Response) {
        try {
            const cancelData = CancelOrderDTO.safeParse(req.body);
            if (!cancelData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(cancelData.error), 400);
            }

            const reason = cancelData.data.note
                ? `${cancelData.data.reason}: ${cancelData.data.note}`
                : cancelData.data.reason;

            const order = await orderService.cancelOrder(req.params.id, reason);
            return ApiResponseHelper.success(res, order, "Order cancelled successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
