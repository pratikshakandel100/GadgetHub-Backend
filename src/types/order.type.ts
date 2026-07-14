import { z } from "zod";
import { ORDER_STATUSES } from "../models/order.model";

export const ShippingAddressSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    phone: z.string().min(1, "Phone number is required"),
    email: z.preprocess(
        (value) => value === "" ? undefined : value,
        z.email("Invalid email address").optional()
    ),
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
    country: z.string().min(1, "Country is required")
});

export const CreateOrderSchema = z.object({
    shippingAddress: ShippingAddressSchema,
    paymentMethod: z.enum(["cod", "online"])
});

export type CreateOrderType = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
    status: z.enum(ORDER_STATUSES)
});

export type UpdateOrderStatusType = z.infer<typeof UpdateOrderStatusSchema>;
