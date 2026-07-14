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
    phone: string;
    email?: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export interface IOrderStatusHistoryEntry {
    status: OrderStatus;
    changedAt: Date;
}

export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId;
    orderNumber: string;
    user: mongoose.Types.ObjectId;
    items: IOrderItem[];
    shippingAddress: IShippingAddress;
    paymentMethod: "cod" | "online";
    subtotal: number;
    shippingFee: number;
    total: number;
    status: OrderStatus;
    statusHistory: IOrderStatusHistoryEntry[];
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
            phone: { type: String, required: true },
            email: { type: String, required: false },
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            zipCode: { type: String, required: true },
            country: { type: String, required: true }
        },
        paymentMethod: { type: String, enum: ["cod", "online"], required: true },
        subtotal: { type: Number, required: true },
        shippingFee: { type: Number, required: true, default: 0 },
        total: { type: Number, required: true },
        status: { type: String, enum: ORDER_STATUSES, default: "Pending" },
        statusHistory: [
            {
                status: { type: String, enum: ORDER_STATUSES, required: true },
                changedAt: { type: Date, required: true, default: Date.now }
            }
        ]
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IOrder>("Order", OrderMongoSchema);
