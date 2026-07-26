import mongoose, { Schema, Document } from "mongoose";

// Fixed, well-known _id — guarantees this collection can only ever hold one
// document (findByIdAndUpdate + upsert against this exact id can never race
// into creating a duplicate the way an empty-filter upsert could).
export const SHIPPING_SETTINGS_ID = "shipping-settings";

export interface IShippingSettings extends Omit<Document, "_id"> {
  _id: string;
  warehouseName: string;
  warehouseAddress: string;
  warehouseLatitude: number;
  warehouseLongitude: number;
  baseShippingCharge: number;
  pricePerKm: number;
  minShippingCharge: number;
  maxShippingCharge: number;
  freeShippingThreshold: number;
  weightPricingEnabled: boolean;
  weightThresholdKg?: number;
  extraChargePerKg?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingSettingsMongoSchema: Schema = new Schema<IShippingSettings>(
  {
    _id: { type: String, default: SHIPPING_SETTINGS_ID },
    warehouseName: { type: String, required: true },
    warehouseAddress: { type: String, required: true },
    warehouseLatitude: { type: Number, required: true },
    warehouseLongitude: { type: Number, required: true },
    baseShippingCharge: { type: Number, required: true, min: 0 },
    pricePerKm: { type: Number, required: true, min: 0 },
    minShippingCharge: { type: Number, required: true, min: 0 },
    maxShippingCharge: { type: Number, required: true, min: 0 },
    freeShippingThreshold: { type: Number, required: true, min: 0 },
    weightPricingEnabled: { type: Boolean, default: false },
    weightThresholdKg: { type: Number, required: false, min: 0 },
    extraChargePerKg: { type: Number, required: false, min: 0 }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IShippingSettings>("ShippingSettings", ShippingSettingsMongoSchema);
