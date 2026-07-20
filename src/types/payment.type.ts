import { z } from "zod";

export const InitiateEsewaPaymentSchema = z.object({
    orderId: z.string().min(1, "Order id is required")
});

export type InitiateEsewaPaymentType = z.infer<typeof InitiateEsewaPaymentSchema>;
