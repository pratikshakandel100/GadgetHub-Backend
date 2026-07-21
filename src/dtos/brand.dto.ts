import { z } from "zod";
import { BrandSchema } from "../types/brand.type";

export const CreateBrandDTO = BrandSchema.pick({
    name: true,
    image: true,
    status: true
});

export type CreateBrandDTO = z.infer<typeof CreateBrandDTO>;

export const UpdateBrandDTO = BrandSchema.pick({
    name: true,
    image: true,
    status: true
}).partial();

export type UpdateBrandDTO = z.infer<typeof UpdateBrandDTO>;

export const BulkCreateBrandDTO = z.array(CreateBrandDTO).min(1, "At least one brand is required");

export type BulkCreateBrandDTO = z.infer<typeof BulkCreateBrandDTO>;
