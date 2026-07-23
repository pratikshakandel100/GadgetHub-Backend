import { z } from "zod";

const optionalNonNegativeNumber = z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
    z.number().min(0).optional()
);

export const ShippingMethodSchema = z.object({
    name: z.string().min(1, "Shipping method name is required"),
    charge: z.coerce.number().min(0, "Charge cannot be negative"),
    estimatedDelivery: z.string().min(1, "Estimated delivery is required"),
    minOrderAmount: optionalNonNegativeNumber,
    isActive: z.coerce.boolean().optional().default(true),
    sortOrder: z.coerce.number().optional().default(0)
});

export type ShippingMethodType = z.infer<typeof ShippingMethodSchema>;

export const UpdateShippingMethodSchema = ShippingMethodSchema.partial();

export type UpdateShippingMethodType = z.infer<typeof UpdateShippingMethodSchema>;
