import mongoose, { Schema, Document } from "mongoose";

export const CATEGORY_ATTRIBUTE_TYPES = ["select", "text", "number"] as const;
export type CategoryAttributeType = typeof CATEGORY_ATTRIBUTE_TYPES[number];

export interface ICategoryAttribute {
    key: string;
    label: string;
    type: CategoryAttributeType;
    options: string[];
    required: boolean;
}

export interface ICategory extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    status: "Active" | "Inactive";
    attributeSchema: ICategoryAttribute[];
    createdAt: Date;
    updatedAt: Date;
}

const CategoryMongoSchema: Schema = new Schema<ICategory>(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String, required: false },
        image: { type: String, required: false },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active"
        },
        attributeSchema: [{
            key: { type: String, required: true },
            label: { type: String, required: true },
            type: { type: String, enum: CATEGORY_ATTRIBUTE_TYPES, required: true },
            options: [{ type: String }],
            required: { type: Boolean, default: false }
        }]
    },
    {
        timestamps: true
    }
);

export default mongoose.model<ICategory>(
    "Category",
    CategoryMongoSchema
);
