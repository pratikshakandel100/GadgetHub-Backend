import { z } from "zod";
import { CreateReviewSchema, UpdateReviewStatusSchema } from "../types/review.type";

export const CreateReviewDTO = CreateReviewSchema;
export type CreateReviewDTO = z.infer<typeof CreateReviewDTO>;

export const UpdateReviewStatusDTO = UpdateReviewStatusSchema;
export type UpdateReviewStatusDTO = z.infer<typeof UpdateReviewStatusDTO>;
