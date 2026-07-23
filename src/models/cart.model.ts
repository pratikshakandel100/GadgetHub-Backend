import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem {
    _id: mongoose.Types.ObjectId;
    product: mongoose.Types.ObjectId;
    quantity: number;
}

export interface ICart extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
}

const CartMongoSchema: Schema = new Schema<ICart>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        items: [
            {
                product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
                quantity: { type: Number, required: true, min: 1, default: 1 }
            }
        ]
    },
    {
        timestamps: true
    }
);

export default mongoose.model<ICart>("Cart", CartMongoSchema);
