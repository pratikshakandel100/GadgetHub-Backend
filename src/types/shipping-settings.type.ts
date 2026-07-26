import { z } from "zod";

const optionalNonNegativeNumber = z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
    z.number().min(0).optional()
);

const BaseShippingSettingsSchema = z.object({
    warehouseName: z.string().min(1, "Warehouse name is required"),
    warehouseAddress: z.string().min(1, "Warehouse address is required"),
    warehouseLatitude: z.coerce.number().min(-90).max(90),
    warehouseLongitude: z.coerce.number().min(-180).max(180),
    baseShippingCharge: z.coerce.number().min(0, "Base shipping charge cannot be negative"),
    pricePerKm: z.coerce.number().min(0, "Price per km cannot be negative"),
    minShippingCharge: z.coerce.number().min(0, "Minimum shipping charge cannot be negative"),
    maxShippingCharge: z.coerce.number().min(0, "Maximum shipping charge cannot be negative"),
    freeShippingThreshold: z.coerce.number().min(0, "Free shipping threshold cannot be negative"),
    weightPricingEnabled: z.coerce.boolean().optional().default(false),
    weightThresholdKg: optionalNonNegativeNumber,
    extraChargePerKg: optionalNonNegativeNumber
});

export const ShippingSettingsSchema = BaseShippingSettingsSchema.refine(
    (data) => data.maxShippingCharge >= data.minShippingCharge,
    { message: "Maximum shipping charge must be greater than or equal to the minimum", path: ["maxShippingCharge"] }
);

export type ShippingSettingsType = z.infer<typeof ShippingSettingsSchema>;

export const UpdateShippingSettingsSchema = BaseShippingSettingsSchema.partial();

export type UpdateShippingSettingsType = z.infer<typeof UpdateShippingSettingsSchema>;
