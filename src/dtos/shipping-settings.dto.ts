import { z } from "zod";
import { ShippingSettingsSchema, UpdateShippingSettingsSchema } from "../types/shipping-settings.type";

export const CreateShippingSettingsDTO = ShippingSettingsSchema;
export type CreateShippingSettingsDTO = z.infer<typeof CreateShippingSettingsDTO>;

export const UpdateShippingSettingsDTO = UpdateShippingSettingsSchema;
export type UpdateShippingSettingsDTO = z.infer<typeof UpdateShippingSettingsDTO>;

export const ShippingQuoteDTO = z.object({
    shippingAddressId: z.string().min(1, "Please select a shipping address")
});
export type ShippingQuoteDTO = z.infer<typeof ShippingQuoteDTO>;
