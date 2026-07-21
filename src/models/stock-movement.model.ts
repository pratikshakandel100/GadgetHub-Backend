import mongoose, { Schema, Document } from "mongoose";

export const STOCK_MOVEMENT_TYPES = ["restock", "adjustment", "order"] as const;
export type StockMovementType = typeof STOCK_MOVEMENT_TYPES[number];

export const STOCK_ADJUSTMENT_REASONS = ["Damaged", "Lost", "Returned", "Manual correction"] as const;
export type StockAdjustmentReason = typeof STOCK_ADJUSTMENT_REASONS[number];

export interface IStockMovement extends Document {
    _id: mongoose.Types.ObjectId;
    product: mongoose.Types.ObjectId;
    type: StockMovementType;
    quantityDelta: number;
    previousStock: number;
    newStock: number;
    reason?: string;
    order?: mongoose.Types.ObjectId;
    orderNumber?: string;
    performedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const StockMovementMongoSchema: Schema = new Schema<IStockMovement>(
    {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
        quantityDelta: { type: Number, required: true },
        previousStock: { type: Number, required: true },
        newStock: { type: Number, required: true },
        reason: { type: String, required: false },
        order: { type: Schema.Types.ObjectId, ref: "Order", required: false },
        orderNumber: { type: String, required: false },
        performedBy: { type: Schema.Types.ObjectId, ref: "User", required: false }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

StockMovementMongoSchema.index({ product: 1, createdAt: -1 });

export default mongoose.model<IStockMovement>("StockMovement", StockMovementMongoSchema);
