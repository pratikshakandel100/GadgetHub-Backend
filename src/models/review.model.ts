import mongoose, { Schema, Document } from "mongoose";

export const REVIEW_STATUSES = ["Published", "Flagged"] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];

export interface IReview extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    product: mongoose.Types.ObjectId;
    order: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    images: string[];
    status: ReviewStatus;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewMongoSchema: Schema = new Schema<IReview>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true, trim: true },
        images: [{ type: String }],
        status: { type: String, enum: REVIEW_STATUSES, default: "Published" }
    },
    {
        timestamps: true
    }
);

ReviewMongoSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", ReviewMongoSchema);
