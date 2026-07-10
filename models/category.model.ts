import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    status: "Active" | "Inactive";
    createdAt: Date;
    updatedAt: Date;
}

const CategoryMongoSchema: Schema = new Schema<ICategory>(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String, required: false },
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

export default mongoose.model<ICategory>(
    "Category",
    CategoryMongoSchema
);
