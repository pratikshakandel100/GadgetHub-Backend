import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 8080;
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gadgethub";
export const SECRET_KEY = process.env.SECRET_KEY || "adgethubsecretjwtkey";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";