import mongoose from "mongoose";
import { connectToMongoDB } from "../database/mongodb";

const slugify = (name: string): string =>
    name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

// One-off migration: Product.subcategory used to be a free-text string. Now
// that it's an ObjectId ref to a Subcategory document, this backfills a
// Subcategory per distinct (category, text) pair seen on existing products
// and repoints each product at the new document. Reads/writes go through the
// raw collections (not the Mongoose models) since the old string values would
// fail to cast against the new ObjectId schema type.
async function migrateSubcategories() {
    await connectToMongoDB();
    const db = mongoose.connection.db!;
    const productsCol = db.collection("products");
    const subcategoriesCol = db.collection("subcategories");

    const productsWithTextSubcategory = await productsCol
        .find({ subcategory: { $type: "string" } })
        .toArray();

    console.log(`Found ${productsWithTextSubcategory.length} products with a free-text subcategory`);

    let cleared = 0;
    let created = 0;
    let reused = 0;
    let repointed = 0;

    // categoryId::lowercasedName -> new Subcategory ObjectId
    const resolvedSubcategories = new Map<string, mongoose.Types.ObjectId>();

    for (const product of productsWithTextSubcategory) {
        const rawName = (product.subcategory as string) ?? "";
        const name = rawName.trim();
        const categoryId = product.category as mongoose.Types.ObjectId;

        if (!name || !categoryId) {
            await productsCol.updateOne({ _id: product._id }, { $unset: { subcategory: "" } });
            cleared++;
            continue;
        }

        const cacheKey = `${categoryId.toString()}::${name.toLowerCase()}`;
        let subcategoryId = resolvedSubcategories.get(cacheKey);

        if (!subcategoryId) {
            const existing = await subcategoriesCol.findOne({
                category: categoryId,
                name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
            });

            if (existing) {
                subcategoryId = existing._id as mongoose.Types.ObjectId;
                reused++;
            } else {
                let slug = slugify(name);
                if (await subcategoriesCol.findOne({ slug })) {
                    slug = `${slug}-${Date.now().toString(36)}`;
                }
                const insertResult = await subcategoriesCol.insertOne({
                    name,
                    slug,
                    category: categoryId,
                    status: "Active",
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                subcategoryId = insertResult.insertedId;
                created++;
            }

            resolvedSubcategories.set(cacheKey, subcategoryId);
        }

        await productsCol.updateOne({ _id: product._id }, { $set: { subcategory: subcategoryId } });
        repointed++;
    }

    console.log(`Created ${created} new subcategories, reused ${reused} existing ones`);
    console.log(`Repointed ${repointed} products, cleared ${cleared} empty/orphaned subcategory values`);
}

migrateSubcategories()
    .then(() => {
        console.log("Done");
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
