import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { OrderService } from "../services/order.service";
import { CreateOrderDTO, UpdateOrderStatusDTO, CancelOrderDTO, ShipOrderDTO } from "../dtos/order.dto";
import { parsePagination, parseSort } from "../utils/query.util";
import { buildEntityLinks, buildCollectionLinks, buildResourceUrl, HateoasLinks } from "../utils/hateoas.util";
import { assertNotStale } from "../utils/precondition.util";

const orderService = new OrderService();

const ORDER_SORT_FIELDS = ["total", "createdAt", "status"];

const orderLinks = (req: Request, order: any): HateoasLinks => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const userId = order.user?._id ?? order.user;
    const extra: HateoasLinks = userId
        ? { user: { href: `${origin}/api/v1/admin/users/${userId}`, method: "GET" } }
        : {};
    return buildEntityLinks(req, order._id.toString(), extra);
};

export class OrderController {
    async createOrder(req: Request, res: Response) {
        const userId = req.user!._id.toString();

        const orderData = CreateOrderDTO.safeParse(req.body);
        if (!orderData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(orderData.error), 400);
        }

        const order = await orderService.createOrder(userId, orderData.data);
        return ApiResponseHelper.success(res, order, "Order placed successfully", 201, undefined, {
            location: buildResourceUrl(req, order._id.toString()),
            links: orderLinks(req, order)
        });
    }

    async getMyOrders(req: Request, res: Response) {
        const userId = req.user!._id.toString();

        const { page, limit } = parsePagination(req.query);
        const status = (req.query.status as string) || "";
        const sort = parseSort(req.query, ORDER_SORT_FIELDS, "createdAt", -1);

        const result = await orderService.getUserOrders(userId, page, limit, status, sort);

        return ApiResponseHelper.success(res, result.orders, "Orders fetched successfully", 200, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }, {
            cacheControl: "private, no-store",
            links: buildCollectionLinks(req, result.page, result.limit, result.total)
        });
    }

    async getAllOrders(req: Request, res: Response) {
        const { page, limit } = parsePagination(req.query);
        const status = (req.query.status as string) || "";
        const search = (req.query.search as string) || "";
        const sort = parseSort(req.query, ORDER_SORT_FIELDS, "createdAt", -1);
        const dateFrom = (req.query.dateFrom as string) || undefined;
        const dateTo = (req.query.dateTo as string) || undefined;
        const paymentMethod = (req.query.paymentMethod as string) || undefined;

        const result = await orderService.getAllOrders(page, limit, status, search, sort, { dateFrom, dateTo, paymentMethod });

        return ApiResponseHelper.success(res, result.orders, "Orders fetched successfully", 200, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }, {
            cacheControl: "private, no-store",
            links: buildCollectionLinks(req, result.page, result.limit, result.total)
        });
    }

    async getOrderById(req: Request<{ id: string }>, res: Response) {
        const userId = req.user!._id.toString();
        const isAdmin = req.user?.role === "admin";

        const order = await orderService.getOrderById(req.params.id, userId, isAdmin);
        return ApiResponseHelper.success(res, order, "Order fetched successfully", 200, undefined, {
            cacheControl: "private, no-store",
            links: orderLinks(req, order)
        });
    }

    async updateOrderStatus(req: Request<{ id: string }>, res: Response) {
        const statusData = UpdateOrderStatusDTO.safeParse(req.body);
        if (!statusData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(statusData.error), 400);
        }

        const existing = await orderService.getOrderById(req.params.id, "", true);
        assertNotStale(req, existing);

        const order = await orderService.updateOrderStatus(req.params.id, statusData.data.status);
        return ApiResponseHelper.success(res, order, "Order status updated successfully", 200, undefined, {
            links: orderLinks(req, order)
        });
    }

    async shipOrder(req: Request<{ id: string }>, res: Response) {
        const shipData = ShipOrderDTO.safeParse(req.body);
        if (!shipData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(shipData.error), 400);
        }

        const existing = await orderService.getOrderById(req.params.id, "", true);
        assertNotStale(req, existing);

        const order = await orderService.shipOrder(req.params.id, shipData.data.courier, shipData.data.trackingNumber);
        return ApiResponseHelper.success(res, order, "Order marked as shipped", 200, undefined, {
            links: orderLinks(req, order)
        });
    }

    async cancelOrder(req: Request<{ id: string }>, res: Response) {
        const cancelData = CancelOrderDTO.safeParse(req.body);
        if (!cancelData.success) {
            return ApiResponseHelper.error(res, z.prettifyError(cancelData.error), 400);
        }

        const existing = await orderService.getOrderById(req.params.id, "", true);
        assertNotStale(req, existing);

        const reason = cancelData.data.note
            ? `${cancelData.data.reason}: ${cancelData.data.note}`
            : cancelData.data.reason;

        const order = await orderService.cancelOrder(req.params.id, reason);
        return ApiResponseHelper.success(res, order, "Order cancelled successfully", 200, undefined, {
            links: orderLinks(req, order)
        });
    }
}
