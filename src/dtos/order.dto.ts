import { z } from "zod";
import { CreateOrderSchema, UpdateOrderStatusSchema, CancelOrderSchema, ShipOrderSchema, DeliverOrderSchema } from "../types/order.type";

export const CreateOrderDTO = CreateOrderSchema;

export type CreateOrderDTO = z.infer<typeof CreateOrderDTO>;

export const UpdateOrderStatusDTO = UpdateOrderStatusSchema;

export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusDTO>;

export const CancelOrderDTO = CancelOrderSchema;

export type CancelOrderDTO = z.infer<typeof CancelOrderDTO>;

export const ShipOrderDTO = ShipOrderSchema;

export type ShipOrderDTO = z.infer<typeof ShipOrderDTO>;

export const DeliverOrderDTO = DeliverOrderSchema;

export type DeliverOrderDTO = z.infer<typeof DeliverOrderDTO>;
