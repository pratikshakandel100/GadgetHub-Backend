import { z } from "zod";

export const AiChatSchema = z.object({
    message: z.string().trim().min(1, "Message is required").max(1000, "Message is too long")
});

export type AiChatType = z.infer<typeof AiChatSchema>;

export const AiCompareSchema = z.object({
    productIds: z.array(z.string()).min(2, "Select at least 2 products to compare").max(4, "You can compare up to 4 products")
});

export type AiCompareType = z.infer<typeof AiCompareSchema>;
