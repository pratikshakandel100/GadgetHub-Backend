import mongoose, { Schema, Document } from "mongoose";

export interface IShippingMethod extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    charge: number;
    estimatedDelivery: string;
    minOrderAmount?: number;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const ShippingMethodMongoSchema: Schema = new Schema<IShippingMethod>(
    {
        name: { type: String, required: true, unique: true },
        charge: { type: Number, required: true, min: 0 },
        estimatedDelivery: { type: String, required: true },
        minOrderAmount: { type: Number, required: false, min: 0 },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 }
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IShippingMethod>(
    "ShippingMethod",
    ShippingMethodMongoSchema
);
