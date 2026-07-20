import { z } from "zod";
import { CartItemSchema, UpdateCartItemSchema } from "../types/cart.type";

export const AddToCartDTO = CartItemSchema;

export type AddToCartDTO = z.infer<typeof AddToCartDTO>;

export const UpdateCartItemDTO = UpdateCartItemSchema;

export type UpdateCartItemDTO = z.infer<typeof UpdateCartItemDTO>;
