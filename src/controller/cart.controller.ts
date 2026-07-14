import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { CartService } from "../services/cart.service";
import { AddToCartDTO, UpdateCartItemDTO } from "../dtos/cart.dto";

const cartService = new CartService();

export class CartController {
    async getCart(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const cart = await cartService.getCart(userId);
            return ApiResponseHelper.success(res, cart, "Cart fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async addToCart(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const itemData = AddToCartDTO.safeParse(req.body);
            if (!itemData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(itemData.error), 400);
            }

            const cart = await cartService.addToCart(userId, itemData.data.productId, itemData.data.quantity);
            return ApiResponseHelper.success(res, cart, "Item added to cart successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async updateCartItem(req: Request<{ productId: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const itemData = UpdateCartItemDTO.safeParse(req.body);
            if (!itemData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(itemData.error), 400);
            }

            const cart = await cartService.updateCartItem(userId, req.params.productId, itemData.data.quantity);
            return ApiResponseHelper.success(res, cart, "Cart item updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async removeFromCart(req: Request<{ productId: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const cart = await cartService.removeFromCart(userId, req.params.productId);
            return ApiResponseHelper.success(res, cart, "Item removed from cart successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async clearCart(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const cart = await cartService.clearCart(userId);
            return ApiResponseHelper.success(res, cart, "Cart cleared successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
