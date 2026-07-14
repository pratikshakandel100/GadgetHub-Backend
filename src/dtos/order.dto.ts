import { z } from "zod";
import { CreateOrderSchema, UpdateOrderStatusSchema } from "../types/order.type";

export const CreateOrderDTO = CreateOrderSchema;

export type CreateOrderDTO = z.infer<typeof CreateOrderDTO>;

export const UpdateOrderStatusDTO = UpdateOrderStatusSchema;

export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusDTO>;
