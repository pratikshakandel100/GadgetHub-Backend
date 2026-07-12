import { z } from "zod";

const optionalString = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().optional()
);

export const CategorySchema = z.object({
    name: z.string().min(1, "Category name is required"),
    slug: optionalString,
    description: optionalString,
    status: z.enum(["Active", "Inactive"]).default("Active")
});

export type CategoryType = z.infer<typeof CategorySchema>;

export const CategoryAttributeSchema = z.object({
    key: z.string().min(1, "Attribute key is required"),
    label: z.string().min(1, "Attribute label is required"),
    type: z.enum(["select", "text", "number"]),
    options: z.array(z.string().min(1)).optional().default([]),
    required: z.boolean().optional().default(false)
});

export type CategoryAttributeType = z.infer<typeof CategoryAttributeSchema>;

export const UpdateCategoryAttributeSchemaPayload = z.object({
    attributeSchema: z.array(CategoryAttributeSchema)
});

export type UpdateCategoryAttributeSchemaPayloadType = z.infer<typeof UpdateCategoryAttributeSchemaPayload>;
