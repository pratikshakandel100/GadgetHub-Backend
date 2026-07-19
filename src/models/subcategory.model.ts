import mongoose, { Schema, Document } from "mongoose";

export interface ISubcategory extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    category: mongoose.Types.ObjectId;
    status: "Active" | "Inactive";
    createdAt: Date;
    updatedAt: Date;
}

const SubcategoryMongoSchema: Schema = new Schema<ISubcategory>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
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

SubcategoryMongoSchema.index({ category: 1, name: 1 }, { unique: true });

export default mongoose.model<ISubcategory>(
    "Subcategory",
    SubcategoryMongoSchema
);
