import mongoose from "mongoose";
import { connectToMongoDB } from "../database/mongodb";
import Brand from "../models/brand.model";
import Product from "../models/product.model";

async function listBrands() {
    await connectToMongoDB();
    const brands = await Brand.find();
    for (const brand of brands) {
        const count = await Product.countDocuments({ brand: brand._id });
        console.log(`${brand.name} | image=${brand.image ?? "(none)"} | products=${count}`);
    }
}

listBrands()
    .then(() => {
        mongoose.connection.close();
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
