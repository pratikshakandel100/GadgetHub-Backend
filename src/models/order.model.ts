import mongoose, { Schema, Document } from "mongoose";

export const ORDER_STATUSES = [
    "Pending",
    "Confirmed",
    "Packed",
    "Shipped",
    "Delivered",
    "Cancelled"
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"] as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export interface IOrderItem {
    product: mongoose.Types.ObjectId;
    name: string;
    sku?: string;
    image?: string;
    price: number;
    quantity: number;
}

export interface IShippingAddress {
    fullName: string;
    phoneNumber: string;
    province: string;
    district: string;
    municipality: string;
    wardNumber: number;
    street: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
    addressType?: string;
}

export interface IOrderStatusHistoryEntry {
    status: OrderStatus;
    changedAt: Date;
}

export interface IOrderShippingMethod {
    name: string;
    estimatedDelivery: string;
}

export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId;
    orderNumber: string;
    user: mongoose.Types.ObjectId;
    items: IOrderItem[];
    shippingAddress: IShippingAddress;
    paymentMethod: "cod";
    paymentStatus: PaymentStatus;
    transactionId?: string;
    paidAt?: Date;
    amount: number;
    currency: string;
    subtotal: number;
    shippingFee: number;
    total: number;
    distanceFromWarehouseKm?: number | null;
    warehouseLatitude?: number;
    warehouseLongitude?: number;
    estimatedDelivery?: string;
    status: OrderStatus;
    statusHistory: IOrderStatusHistoryEntry[];
    shippingMethod?: IOrderShippingMethod;
    // Captured at the Ship step (Packed -> Shipped) — Deliver takes no input,
    // it's a plain confirmation the order reached the customer.
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    cancelReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OrderMongoSchema: Schema = new Schema<IOrder>(
    {
        orderNumber: { type: String, required: true, unique: true },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        items: [
            {
                product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
                name: { type: String, required: true },
                sku: { type: String, required: false },
                image: { type: String, required: false },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true, min: 1 }
            }
        ],
        shippingAddress: {
            fullName: { type: String, required: true },
            phoneNumber: { type: String, required: true },
            province: { type: String, required: true },
            district: { type: String, required: true },
            municipality: { type: String, required: true },
            wardNumber: { type: Number, required: true },
            street: { type: String, required: true },
            landmark: { type: String, required: false },
            latitude: { type: Number, required: false },
            longitude: { type: Number, required: false },
            addressType: { type: String, required: false }
        },
        paymentMethod: { type: String, enum: ["cod"], required: true },
        paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "Pending" },
        transactionId: { type: String, required: false },
        paidAt: { type: Date, required: false },
        amount: { type: Number, required: true },
        currency: { type: String, required: true, default: "NPR" },
        subtotal: { type: Number, required: true },
        shippingFee: { type: Number, required: true, default: 0 },
        total: { type: Number, required: true },
        distanceFromWarehouseKm: { type: Number, required: false, default: null },
        warehouseLatitude: { type: Number, required: false },
        warehouseLongitude: { type: Number, required: false },
        estimatedDelivery: { type: String, required: false },
        status: { type: String, enum: ORDER_STATUSES, default: "Pending" },
        statusHistory: [
            {
                status: { type: String, enum: ORDER_STATUSES, required: true },
                changedAt: { type: Date, required: true, default: Date.now }
            }
        ],
        shippingMethod: {
            type: {
                name: { type: String, required: true },
                estimatedDelivery: { type: String, required: true }
            },
            required: false,
            _id: false
        },
        deliveryPersonName: { type: String, required: false },
        deliveryPersonPhone: { type: String, required: false },
        cancelReason: { type: String, required: false }
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IOrder>("Order", OrderMongoSchema);
