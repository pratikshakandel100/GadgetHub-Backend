import { z } from "zod";

const optionalString = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().optional()
);

export const BrandSchema = z.object({
    name: z.string().min(1, "Brand name is required"),
    slug: optionalString,
    status: z.enum(["Active", "Inactive"]).default("Active")
});

export type BrandType = z.infer<typeof BrandSchema>;
