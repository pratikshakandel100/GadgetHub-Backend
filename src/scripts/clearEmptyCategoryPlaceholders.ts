import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToMongoDB } from "../database/mongodb";
import Category from "../models/category.model";

// One-off cleanup: categories with no published products still had a
// leftover gradient placeholder from assignCategoryPlaceholderImages.ts.
// Clears those so they fall back to the default icon instead of a fake photo.
async function clearEmptyCategoryPlaceholders() {
    await connectToMongoDB();
    const uploadsDir = path.join(process.cwd(), "uploads");

    const categories = await Category.find({ image: /-placeholder\.svg$/ });
    console.log(`Found ${categories.length} categories still on a placeholder`);

    for (const category of categories) {
        const filePath = path.join(uploadsDir, path.basename(category.image!));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await Category.updateOne({ _id: category._id }, { $unset: { image: "" } });
        console.log(`Cleared placeholder for "${category.name}"`);
    }
}

clearEmptyCategoryPlaceholders()
    .then(() => {
        mongoose.connection.close();
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
