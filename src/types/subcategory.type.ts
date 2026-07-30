import { z } from "zod";

const optionalString = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().optional()
);

export const SubcategorySchema = z.object({
    name: z.string().min(1, "Subcategory name is required"),
    nameNe: optionalString,
    slug: optionalString,
    category: z.string().min(1, "Category is required"),
    status: z.enum(["Active", "Inactive"]).default("Active")
});

export type SubcategoryType = z.infer<typeof SubcategorySchema>;
