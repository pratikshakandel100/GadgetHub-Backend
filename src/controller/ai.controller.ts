import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { AiChatService } from "../services/ai.service";
import { AiChatSchema, AiCompareSchema } from "../types/ai.type";

const aiChatService = new AiChatService();

export class AiController {
    async chat(req: Request, res: Response) {
        const parsed = AiChatSchema.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
        }

        const result = await aiChatService.chat(parsed.data.message);
        return ApiResponseHelper.success(res, result, "Response generated successfully", 200, undefined, {
            cacheControl: "private, no-store"
        });
    }

    async compare(req: Request, res: Response) {
        const parsed = AiCompareSchema.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
        }

        const result = await aiChatService.compareProducts(parsed.data.productIds);
        return ApiResponseHelper.success(res, result, "Comparison generated successfully", 200, undefined, {
            cacheControl: "private, no-store"
        });
    }
}
