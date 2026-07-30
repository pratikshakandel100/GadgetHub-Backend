import { z } from "zod";
import { SubcategorySchema } from "../types/subcategory.type";

export const CreateSubcategoryDTO = SubcategorySchema.pick({
    name: true,
    nameNe: true,
    category: true,
    status: true
});

export type CreateSubcategoryDTO = z.infer<typeof CreateSubcategoryDTO>;

export const UpdateSubcategoryDTO = SubcategorySchema.pick({
    name: true,
    nameNe: true,
    category: true,
    status: true
}).partial();

export type UpdateSubcategoryDTO = z.infer<typeof UpdateSubcategoryDTO>;

export const BulkCreateSubcategoryDTO = z.array(CreateSubcategoryDTO).min(1, "At least one subcategory is required");

export type BulkCreateSubcategoryDTO = z.infer<typeof BulkCreateSubcategoryDTO>;
