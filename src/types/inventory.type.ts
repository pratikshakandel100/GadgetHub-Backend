import { z } from "zod";
import { STOCK_ADJUSTMENT_REASONS } from "../models/stock-movement.model";

export const RestockSchema = z.object({
    quantity: z.coerce.number().int().positive("Quantity must be a positive whole number")
});

export type RestockType = z.infer<typeof RestockSchema>;

export const AdjustStockSchema = z.object({
    delta: z.coerce.number().int().refine((value) => value !== 0, "Adjustment cannot be zero"),
    reason: z.enum(STOCK_ADJUSTMENT_REASONS)
});

export type AdjustStockType = z.infer<typeof AdjustStockSchema>;
