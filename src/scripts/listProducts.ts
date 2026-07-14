import { connectToMongoDB } from "../database/mongodb";
import Product from "../models/product.model";

async function list() {
  await connectToMongoDB();
  const products = await Product.find({});
  console.log("Products in DB:", JSON.stringify(products, null, 2));
  process.exit(0);
}

list().catch(console.error);
