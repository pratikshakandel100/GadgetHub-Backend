import { z } from "zod";
import { ShippingMethodSchema, UpdateShippingMethodSchema } from "../types/shipping-method.type";

export const CreateShippingMethodDTO = ShippingMethodSchema;

export type CreateShippingMethodDTO = z.infer<typeof CreateShippingMethodDTO>;

export const UpdateShippingMethodDTO = UpdateShippingMethodSchema;

export type UpdateShippingMethodDTO = z.infer<typeof UpdateShippingMethodDTO>;
