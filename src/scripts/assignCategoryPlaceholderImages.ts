import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToMongoDB } from "../database/mongodb";
import Category from "../models/category.model";

// Diagonal gradient pairs pulled from the site's existing palette (cyan/slate
// accents plus a few complementary tones) so placeholders read as "part of
// the brand" rather than random colors.
const GRADIENTS: [string, string][] = [
    ["#06b6d4", "#0f172a"], // cyan -> slate-900 (matches homepage fallback tile)
    ["#0ea5e9", "#1e293b"],
    ["#14b8a6", "#134e4a"],
    ["#6366f1", "#1e1b4b"],
    ["#8b5cf6", "#2e1065"],
    ["#f59e0b", "#78350f"],
    ["#ef4444", "#450a0a"],
    ["#ec4899", "#500724"],
    ["#22c55e", "#052e16"],
    ["#3b82f6", "#0c1a3d"],
];

const slugify = (name: string): string =>
    name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const buildPlaceholderSvg = (name: string, [from, to]: [string, string]): string => {
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="600" fill="url(#bg)"/>
  <text x="240" y="340" font-family="Arial, Helvetica, sans-serif" font-size="220" font-weight="700"
        fill="#ffffff" fill-opacity="0.22" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>`;
};

async function assignCategoryPlaceholderImages() {
    await connectToMongoDB();

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const categories = await Category.find({ $or: [{ image: { $exists: false } }, { image: "" }, { image: null }] });
    console.log(`Found ${categories.length} categories without an image`);

    let assigned = 0;
    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const gradient = GRADIENTS[i % GRADIENTS.length];
        const svg = buildPlaceholderSvg(category.name, gradient);
        const filename = `${slugify(category.name)}-placeholder.svg`;
        fs.writeFileSync(path.join(uploadsDir, filename), svg, "utf-8");

        await Category.updateOne({ _id: category._id }, { $set: { image: `/uploads/${filename}` } });
        console.log(`Assigned placeholder to "${category.name}" -> /uploads/${filename}`);
        assigned++;
    }

    console.log(`Done. Assigned ${assigned} placeholder image(s).`);
}

assignCategoryPlaceholderImages()
    .then(() => {
        mongoose.connection.close();
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
