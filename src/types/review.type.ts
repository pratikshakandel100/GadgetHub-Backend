import { z } from "zod";
import { REVIEW_STATUSES } from "../models/review.model";

export const CreateReviewSchema = z.object({
    product: z.string().min(1, "Product id is required"),
    order: z.string().min(1, "Order id is required"),
    rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    comment: z.string().trim().min(1, "Comment is required").max(1000, "Comment is too long")
});

export type CreateReviewType = z.infer<typeof CreateReviewSchema>;

export const UpdateReviewStatusSchema = z.object({
    status: z.enum(REVIEW_STATUSES)
});

export type UpdateReviewStatusType = z.infer<typeof UpdateReviewStatusSchema>;
