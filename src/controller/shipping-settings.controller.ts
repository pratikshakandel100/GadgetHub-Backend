import { z } from "zod";
import { Request, Response } from "express";
import { ShippingSettingsService } from "../services/shipping-settings.service";
import { ShippingAddressMongoRepository } from "../repositories/shipping-address.repository";
import { CartMongoRepository } from "../repositories/cart.repository";
import { calculateShipping } from "../services/shipping-calculation.service";
import { UpdateShippingSettingsDTO, ShippingQuoteDTO } from "../dtos/shipping-settings.dto";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";

const shippingSettingsService = new ShippingSettingsService();
const shippingAddressRepository = new ShippingAddressMongoRepository();
const cartRepository = new CartMongoRepository();

interface IPopulatedCartProduct {
    sellingPrice: number;
    freeShippingEligible?: boolean;
}

interface IPopulatedCartItem {
    product: IPopulatedCartProduct;
    quantity: number;
}

export class ShippingSettingsController {
    async getSettings(req: Request, res: Response) {
        try {
            const settings = await shippingSettingsService.getSettings();
            return ApiResponseHelper.success(res, settings, "Shipping settings fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async updateSettings(req: Request, res: Response) {
        try {
            const parsed = UpdateShippingSettingsDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
            }
            const settings = await shippingSettingsService.updateSettings(parsed.data);
            return ApiResponseHelper.success(res, settings, "Shipping settings updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async getQuote(req: Request, res: Response) {
        try {
            const parsed = ShippingQuoteDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
            }

            const userId = req.user!._id.toString();
            const savedAddress = await shippingAddressRepository.getById(parsed.data.shippingAddressId);
            if (!savedAddress || savedAddress.user.toString() !== userId) {
                throw new HttpException(404, "Shipping address not found");
            }

            const cart = await cartRepository.findByUser(userId);
            const cartItems = (cart?.items ?? []) as unknown as IPopulatedCartItem[];

            const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
            const freeShippingEligible = cartItems.length > 0 && cartItems.every((item) => item.product.freeShippingEligible);

            const settings = await shippingSettingsService.getSettings();
            const quote = calculateShipping(
                {
                    destLat: savedAddress.latitude,
                    destLng: savedAddress.longitude,
                    subtotal,
                    freeShippingEligible
                },
                settings
            );

            return ApiResponseHelper.success(res, quote, "Shipping quote calculated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
