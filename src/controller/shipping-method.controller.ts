import { ShippingMethodService } from "../services/shipping-method.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { CreateShippingMethodDTO, UpdateShippingMethodDTO } from "../dtos/shipping-method.dto";

const shippingMethodService = new ShippingMethodService();

export class ShippingMethodController {
    async createShippingMethod(req: Request, res: Response) {
        try {
            const parsed = CreateShippingMethodDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
            }
            const method = await shippingMethodService.createShippingMethod(parsed.data);
            return ApiResponseHelper.success(res, method, "Shipping method created successfully", 201);
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getAllShippingMethods(req: Request, res: Response) {
        try {
            const methods = await shippingMethodService.getAllShippingMethods();
            return ApiResponseHelper.success(res, methods, "Shipping methods fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getActiveShippingMethods(req: Request, res: Response) {
        try {
            const methods = await shippingMethodService.getActiveShippingMethods();
            return ApiResponseHelper.success(res, methods, "Shipping methods fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getShippingMethodById(req: Request<{ id: string }>, res: Response) {
        try {
            const method = await shippingMethodService.getShippingMethodById(req.params.id);
            return ApiResponseHelper.success(res, method, "Shipping method fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async updateShippingMethod(req: Request<{ id: string }>, res: Response) {
        try {
            const parsed = UpdateShippingMethodDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
            }
            const method = await shippingMethodService.updateShippingMethod(req.params.id, parsed.data);
            return ApiResponseHelper.success(res, method, "Shipping method updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async deleteShippingMethod(req: Request<{ id: string }>, res: Response) {
        try {
            await shippingMethodService.deleteShippingMethod(req.params.id);
            return ApiResponseHelper.success(res, {}, "Shipping method deleted successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
