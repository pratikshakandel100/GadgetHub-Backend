import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToMongoDB } from "../database/mongodb";
import Category from "../models/category.model";
import Product from "../models/product.model";

// Replaces the gradient placeholders from assignCategoryPlaceholderImages.ts
// with a real photo borrowed from one of the category's own products.
const PLACEHOLDER_SUFFIX = "-placeholder.svg";

async function assignCategoryImagesFromProducts() {
    await connectToMongoDB();

    const uploadsDir = path.join(process.cwd(), "uploads");
    const categories = await Category.find();
    console.log(`Checking ${categories.length} categories`);

    let assigned = 0;
    let skipped = 0;

    for (const category of categories) {
        const product = await Product.findOne({
            category: category._id,
            status: "Published",
            mainImage: { $exists: true, $nin: [null, ""] },
        }).sort({ createdAt: 1 });

        const previousImage = category.image;

        if (!product) {
            console.log(`No published product with an image for "${category.name}" — leaving as is`);
            skipped++;
            continue;
        }

        await Category.updateOne({ _id: category._id }, { $set: { image: product.mainImage } });
        console.log(`"${category.name}" -> ${product.mainImage} (from product "${product.name}")`);
        assigned++;

        // Clean up the placeholder file it's replacing, if that's what was there.
        if (previousImage && previousImage.endsWith(PLACEHOLDER_SUFFIX)) {
            const filePath = path.join(uploadsDir, path.basename(previousImage));
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
    }

    console.log(`Done. Assigned ${assigned}, skipped ${skipped} (no published product with an image).`);
}

assignCategoryImagesFromProducts()
    .then(() => {
        mongoose.connection.close();
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
