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
