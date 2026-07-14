import mongoose, { Schema, Document } from "mongoose";

export interface IWishlist extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    products: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const WishlistMongoSchema: Schema = new Schema<IWishlist>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        products: [{ type: Schema.Types.ObjectId, ref: "Product" }]
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IWishlist>("Wishlist", WishlistMongoSchema);
