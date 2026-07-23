import { z } from "zod";
import { ORDER_STATUSES } from "../models/order.model";

export const CreateOrderSchema = z.object({
    shippingAddressId: z.string().min(1, "Please select a shipping address"),
    shippingMethodId: z.string().min(1).optional(),
    paymentMethod: z.enum(["cod", "online"])
});

export type CreateOrderType = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
    status: z.enum(ORDER_STATUSES)
});

export type UpdateOrderStatusType = z.infer<typeof UpdateOrderStatusSchema>;

export const CANCEL_REASONS = ["Out of Stock", "Invalid Payment", "Customer Request", "Other"] as const;

export const CancelOrderSchema = z.object({
    reason: z.enum(CANCEL_REASONS),
    note: z.preprocess(
        (value) => value === "" ? undefined : value,
        z.string().optional()
    )
});

export type CancelOrderType = z.infer<typeof CancelOrderSchema>;

export const ShipOrderSchema = z.object({
    courier: z.string().min(1, "Courier name is required"),
    trackingNumber: z.string().min(1, "Tracking number is required")
});

export type ShipOrderType = z.infer<typeof ShipOrderSchema>;

export const DeliverOrderSchema = z.object({
    deliveryPersonName: z.string().min(1, "Delivery person's name is required"),
    deliveryPersonPhone: z.string().min(1, "Delivery person's phone number is required")
});

export type DeliverOrderType = z.infer<typeof DeliverOrderSchema>;
