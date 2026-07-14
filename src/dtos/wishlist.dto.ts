import { z } from "zod";
import { WishlistItemSchema } from "../types/wishlist.type";

export const AddToWishlistDTO = WishlistItemSchema;

export type AddToWishlistDTO = z.infer<typeof AddToWishlistDTO>;
