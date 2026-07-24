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

// Where the backend and frontend are reachable — used to build the
// eSewa callback URLs (backend) and the final redirect back into the app (frontend).
export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// eSewa ePay v2 sandbox/UAT defaults — publicly documented test credentials,
// safe to ship as fallbacks; override with real merchant credentials in production.
export const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";
export const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
export const ESEWA_PAYMENT_URL = process.env.ESEWA_PAYMENT_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
export const ESEWA_STATUS_CHECK_URL = process.env.ESEWA_STATUS_CHECK_URL || "https://rc.esewa.com.np/api/epay/transaction/status/";

// Meilisearch is optional in development. When these values are absent the
// product search endpoint transparently falls back to MongoDB.
export const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || "";
export const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || "";
