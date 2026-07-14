import mongoose, { Schema, Document } from "mongoose";

export const NOTIFICATION_AUDIENCES = ["admin", "user"] as const;
export type NotificationAudience = typeof NOTIFICATION_AUDIENCES[number];

export const NOTIFICATION_TYPES = ["order_placed", "order_status_changed"] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    audience: NotificationAudience;
    recipient?: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    order?: mongoose.Types.ObjectId;
    orderNumber?: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationMongoSchema: Schema = new Schema<INotification>(
    {
        audience: { type: String, enum: NOTIFICATION_AUDIENCES, required: true },
        recipient: { type: Schema.Types.ObjectId, ref: "User", required: false },
        type: { type: String, enum: NOTIFICATION_TYPES, required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        order: { type: Schema.Types.ObjectId, ref: "Order", required: false },
        orderNumber: { type: String, required: false },
        read: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
);

NotificationMongoSchema.index({ audience: 1, recipient: 1, createdAt: -1 });

export default mongoose.model<INotification>("Notification", NotificationMongoSchema);
