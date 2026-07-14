import { z } from "zod";

export const WishlistItemSchema = z.object({
    productId: z.string().min(1, "Product id is required")
});

export type WishlistItemType = z.infer<typeof WishlistItemSchema>;
