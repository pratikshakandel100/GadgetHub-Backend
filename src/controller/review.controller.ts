import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { ReviewService } from "../services/review.service";
import { CreateReviewDTO, UpdateReviewStatusDTO } from "../dtos/review.dto";
import { parsePagination, parseSort } from "../utils/query.util";

const reviewService = new ReviewService();

const REVIEW_SORT_FIELDS = ["createdAt", "rating"];

export class ReviewController {
    async createReview(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const reviewData = CreateReviewDTO.safeParse(req.body);
            if (!reviewData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(reviewData.error), 400);
            }

            const review = await reviewService.createReview(userId, reviewData.data);
            return ApiResponseHelper.success(res, review, "Review submitted successfully", 201);
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getMyReviews(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }

            const reviews = await reviewService.getMyReviews(userId);
            return ApiResponseHelper.success(res, reviews, "Reviews fetched successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async getAllReviews(req: Request, res: Response) {
        try {
            const { page, limit } = parsePagination(req.query);
            const status = (req.query.status as string) || "";
            const search = (req.query.search as string) || "";
            const sort = parseSort(req.query, REVIEW_SORT_FIELDS, "createdAt", -1);

            const result = await reviewService.getAllReviews(page, limit, status, search, sort);
            return ApiResponseHelper.success(res, result.reviews, "Reviews fetched successfully", 200, {
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

    async updateReviewStatus(req: Request<{ id: string }>, res: Response) {
        try {
            const statusData = UpdateReviewStatusDTO.safeParse(req.body);
            if (!statusData.success) {
                return ApiResponseHelper.error(res, z.prettifyError(statusData.error), 400);
            }

            const review = await reviewService.updateReviewStatus(req.params.id, statusData.data.status);
            return ApiResponseHelper.success(res, review, "Review status updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async deleteReview(req: Request<{ id: string }>, res: Response) {
        try {
            await reviewService.deleteReview(req.params.id);
            return ApiResponseHelper.success(res, null, "Review deleted successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
}
