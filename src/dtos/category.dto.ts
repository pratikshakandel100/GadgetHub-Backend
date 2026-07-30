import { z } from "zod";
import { CategorySchema, UpdateCategoryAttributeSchemaPayload } from "../types/category.type";

export const CreateCategoryDTO = CategorySchema.pick({
    name: true,
    nameNe: true,
    description: true,
    image: true,
    status: true
});

export type CreateCategoryDTO = z.infer<typeof CreateCategoryDTO>;

export const UpdateCategoryDTO = CategorySchema.pick({
    name: true,
    nameNe: true,
    description: true,
    image: true,
    status: true
}).partial();

export type UpdateCategoryDTO = z.infer<typeof UpdateCategoryDTO>;

export const UpdateCategoryAttributesDTO = UpdateCategoryAttributeSchemaPayload;

export type UpdateCategoryAttributesDTO = z.infer<typeof UpdateCategoryAttributesDTO>;

export const BulkCreateSubcategoryItemDTO = z.object({
    name: z.string().min(1, "Subcategory name is required"),
    nameNe: z.string().optional(),
    status: z.enum(["Active", "Inactive"]).default("Active")
});

export type BulkCreateSubcategoryItemDTO = z.infer<typeof BulkCreateSubcategoryItemDTO>;

export const BulkCreateCategoryItemDTO = CreateCategoryDTO.extend({
    subcategories: z.array(BulkCreateSubcategoryItemDTO).optional().default([])
});

export type BulkCreateCategoryItemDTO = z.infer<typeof BulkCreateCategoryItemDTO>;

export const BulkCreateCategoryDTO = z.array(BulkCreateCategoryItemDTO).min(1, "At least one category is required");

export type BulkCreateCategoryDTO = z.infer<typeof BulkCreateCategoryDTO>;
