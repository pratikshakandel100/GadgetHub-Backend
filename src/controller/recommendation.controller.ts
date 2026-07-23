import { Request, Response } from "express";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { RecommendationService } from "../services/recommendation.service";

const recommendationService = new RecommendationService();

export class RecommendationController {
    async getRecommendedForUser(req: Request, res: Response) {
        const userId = req.user!._id.toString();
        const limit = req.query.limit ? Number(req.query.limit) : undefined;

        const products = await recommendationService.getRecommendedForUser(userId, limit);
        return ApiResponseHelper.success(res, products, "Recommended products fetched successfully", 200, undefined, {
            cacheControl: "private, no-store"
        });
    }

    async getFrequentlyBoughtTogether(req: Request<{ productId: string }>, res: Response) {
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const products = await recommendationService.getFrequentlyBoughtTogether(req.params.productId, limit);
        return ApiResponseHelper.success(res, products, "Frequently bought together products fetched successfully", 200, undefined, {
            cacheControl: "public, max-age=60"
        });
    }
}
