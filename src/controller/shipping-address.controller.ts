import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { ShippingAddressService } from "../services/shipping-address.service";
import { CreateShippingAddressDTO, UpdateShippingAddressDTO } from "../dtos/shipping-address.dto";

const shippingAddressService = new ShippingAddressService();

export class ShippingAddressController {
    async getAddresses(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const addresses = await shippingAddressService.getUserAddresses(userId);
            return ApiResponseHelper.success(res, addresses, "Shipping addresses fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async getAddressById(req: Request<{ id: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const address = await shippingAddressService.getAddressById(userId, req.params.id);
            return ApiResponseHelper.success(res, address, "Shipping address fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async createAddress(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const addressData = CreateShippingAddressDTO.safeParse(req.body);
            if (!addressData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(addressData.error), 400);
            }
            const address = await shippingAddressService.createAddress(userId, addressData.data);
            return ApiResponseHelper.success(res, address, "Shipping address added successfully", 201);
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async updateAddress(req: Request<{ id: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const addressData = UpdateShippingAddressDTO.safeParse(req.body);
            if (!addressData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(addressData.error), 400);
            }
            const address = await shippingAddressService.updateAddress(userId, req.params.id, addressData.data);
            return ApiResponseHelper.success(res, address, "Shipping address updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async deleteAddress(req: Request<{ id: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            await shippingAddressService.deleteAddress(userId, req.params.id);
            return ApiResponseHelper.success(res, {}, "Shipping address deleted successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async setDefaultAddress(req: Request<{ id: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const address = await shippingAddressService.setDefaultAddress(userId, req.params.id);
            return ApiResponseHelper.success(res, address, "Default shipping address updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
