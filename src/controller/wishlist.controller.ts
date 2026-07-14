import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { WishlistService } from "../services/wishlist.service";
import { AddToWishlistDTO } from "../dtos/wishlist.dto";

const wishlistService = new WishlistService();

export class WishlistController {
    async getWishlist(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const wishlist = await wishlistService.getWishlist(userId);
            return ApiResponseHelper.success(res, wishlist, "Wishlist fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async addToWishlist(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const itemData = AddToWishlistDTO.safeParse(req.body);
            if (!itemData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(itemData.error), 400);
            }

            const wishlist = await wishlistService.addToWishlist(userId, itemData.data.productId);
            return ApiResponseHelper.success(res, wishlist, "Product added to wishlist successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async removeFromWishlist(req: Request<{ productId: string }>, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const wishlist = await wishlistService.removeFromWishlist(userId, req.params.productId);
            return ApiResponseHelper.success(res, wishlist, "Product removed from wishlist successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
