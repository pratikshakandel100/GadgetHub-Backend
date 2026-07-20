import { z } from "zod";

export const CartItemSchema = z.object({
    productId: z.string().min(1, "Product id is required"),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").default(1)
});

export type CartItemType = z.infer<typeof CartItemSchema>;

export const UpdateCartItemSchema = z.object({
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1")
});

export type UpdateCartItemType = z.infer<typeof UpdateCartItemSchema>;
