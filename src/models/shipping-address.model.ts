import mongoose, { Schema, Document } from "mongoose";

export const NEPAL_PROVINCES = [
    "Koshi",
    "Madhesh",
    "Bagmati",
    "Gandaki",
    "Lumbini",
    "Karnali",
    "Sudurpashchim"
] as const;

export const ADDRESS_TYPES = ["Home", "Office", "Other"] as const;

export type AddressType = typeof ADDRESS_TYPES[number];

export interface IShippingAddress extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    fullName: string;
    phoneNumber: string;
    province: string;
    district: string;
    municipality: string;
    wardNumber: number;
    street: string;
    landmark?: string;
    addressType: AddressType;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ShippingAddressMongoSchema: Schema = new Schema<IShippingAddress>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        fullName: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String, required: true },
        municipality: { type: String, required: true },
        wardNumber: { type: Number, required: true },
        street: { type: String, required: true },
        landmark: { type: String, required: false },
        addressType: { type: String, enum: ADDRESS_TYPES, default: "Home" },
        isDefault: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
);

ShippingAddressMongoSchema.index({ user: 1 });

export default mongoose.model<IShippingAddress>("ShippingAddress", ShippingAddressMongoSchema);
