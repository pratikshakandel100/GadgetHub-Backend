import { z } from "zod";
import { ORDER_STATUSES } from "../models/order.model";

export const CreateOrderSchema = z.object({
    shippingAddressId: z.string().min(1, "Please select a shipping address"),
    paymentMethod: z.enum(["cod", "online"])
});

export type CreateOrderType = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
    status: z.enum(ORDER_STATUSES)
});

export type UpdateOrderStatusType = z.infer<typeof UpdateOrderStatusSchema>;
