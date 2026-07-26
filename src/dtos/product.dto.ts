import { z } from "zod";
import { ProductSchema } from "../types/product.type";

export const CreateProductDTO = ProductSchema.refine(
    (data) => data.originalPrice >= data.costPrice,
    { message: "Original price must be greater than or equal to cost price", path: ["originalPrice"] }
);

export type CreateProductDTO = z.infer<typeof CreateProductDTO>;

export const UpdateProductDTO = ProductSchema.partial();

export type UpdateProductDTO = z.infer<typeof UpdateProductDTO>;

export const UpdateProductStatusDTO = z.object({
    status: z.enum(["Draft", "Published"])
});

export type UpdateProductStatusDTO = z.infer<typeof UpdateProductStatusDTO>;

export const BulkCreateProductDTO = z.array(CreateProductDTO).min(1, "At least one product is required");

export type BulkCreateProductDTO = z.infer<typeof BulkCreateProductDTO>;

export const BulkDeleteProductDTO = z.object({
    ids: z.array(z.string()).optional().default([]),
    names: z.array(z.string()).optional().default([])
}).refine((data) => data.ids.length > 0 || data.names.length > 0, {
    message: "Provide at least one product id or name to delete"
});

export type BulkDeleteProductDTO = z.infer<typeof BulkDeleteProductDTO>;
