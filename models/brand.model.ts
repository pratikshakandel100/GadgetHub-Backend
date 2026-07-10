import mongoose, { Schema, Document } from "mongoose";

export interface IBrand extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    status: "Active" | "Inactive";
    createdAt: Date;
    updatedAt: Date;
}

const BrandMongoSchema: Schema = new Schema<IBrand>(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active"
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IBrand>(
    "Brand",
    BrandMongoSchema
);
