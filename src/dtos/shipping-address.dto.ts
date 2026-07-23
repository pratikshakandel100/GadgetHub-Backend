import { z } from "zod";
import { ShippingAddressSchema } from "../types/shipping-address.type";

export const CreateShippingAddressDTO = ShippingAddressSchema;
export type CreateShippingAddressDTO = z.infer<typeof CreateShippingAddressDTO>;

export const UpdateShippingAddressDTO = ShippingAddressSchema.partial();
export type UpdateShippingAddressDTO = z.infer<typeof UpdateShippingAddressDTO>;
