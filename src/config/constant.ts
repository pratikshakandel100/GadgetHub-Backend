import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 8080;
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gadgethub";
export const SECRET_KEY = process.env.SECRET_KEY || "adgethubsecretjwtkey";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

// IP-level backstop against one IP spraying login attempts across many accounts.
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 20);
export const LOGIN_RATE_LIMIT_WINDOW_MINUTES = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15);

// Where the backend and frontend are reachable.
export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Meilisearch is optional in development. When these values are absent the
// product search endpoint transparently falls back to MongoDB.
export const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || "";
export const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || "";
