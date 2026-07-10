import { z } from "zod";
import { BrandSchema } from "../types/brand.type";

export const CreateBrandDTO = BrandSchema.pick({
    name: true,
    status: true
});

export type CreateBrandDTO = z.infer<typeof CreateBrandDTO>;

export const UpdateBrandDTO = BrandSchema.pick({
    name: true,
    status: true
}).partial();

export type UpdateBrandDTO = z.infer<typeof UpdateBrandDTO>;
