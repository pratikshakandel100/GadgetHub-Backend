import { z } from "zod";
import { ProductSchema } from "../types/product.type";

export const CreateProductDTO = ProductSchema;

export type CreateProductDTO = z.infer<typeof CreateProductDTO>;

export const UpdateProductDTO = ProductSchema.partial();

export type UpdateProductDTO = z.infer<typeof UpdateProductDTO>;

export const UpdateProductStatusDTO = z.object({
    status: z.enum(["Draft", "Published"])
});

export type UpdateProductStatusDTO = z.infer<typeof UpdateProductStatusDTO>;
