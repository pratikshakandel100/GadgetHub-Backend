import { z } from "zod";
import { SubcategorySchema } from "../types/subcategory.type";

export const CreateSubcategoryDTO = SubcategorySchema.pick({
    name: true,
    category: true,
    status: true
});

export type CreateSubcategoryDTO = z.infer<typeof CreateSubcategoryDTO>;

export const UpdateSubcategoryDTO = SubcategorySchema.pick({
    name: true,
    category: true,
    status: true
}).partial();

export type UpdateSubcategoryDTO = z.infer<typeof UpdateSubcategoryDTO>;
