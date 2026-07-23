import { z } from "zod";
import { InitiateEsewaPaymentSchema } from "../types/payment.type";

export const InitiateEsewaPaymentDTO = InitiateEsewaPaymentSchema;
export type InitiateEsewaPaymentDTO = z.infer<typeof InitiateEsewaPaymentDTO>;
