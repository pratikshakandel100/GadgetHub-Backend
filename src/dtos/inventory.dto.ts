import { z } from "zod";
import { RestockSchema, AdjustStockSchema } from "../types/inventory.type";

export const RestockDTO = RestockSchema;

export type RestockDTO = z.infer<typeof RestockDTO>;

export const AdjustStockDTO = AdjustStockSchema;

export type AdjustStockDTO = z.infer<typeof AdjustStockDTO>;
