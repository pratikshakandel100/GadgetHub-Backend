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

// Access tokens are short-lived; refresh tokens are long-lived, stored
// server-side (hashed) so they can be revoked on logout/password reset.
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
export const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);

// Login abuse protection — two layers that need different thresholds:
// account lockout (below) is the tight, user-facing "5 wrong passwords"
// rule for one account. This IP-level limit is a looser backstop against
// one IP spraying many different accounts; it must stay well above the
// lockout threshold or it fires first and account lockout never engages.
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 20);
export const LOGIN_RATE_LIMIT_WINDOW_MINUTES = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15);
export const ACCOUNT_LOCKOUT_MAX_ATTEMPTS = Number(process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS || 5);
export const ACCOUNT_LOCKOUT_MINUTES = Number(process.env.ACCOUNT_LOCKOUT_MINUTES || 15);

// Password reset link validity.
export const PASSWORD_RESET_EXPIRES_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 10);

// SMTP transport for verification/reset emails. Leave unset in dev — the
// reset link is logged to the server console instead of actually emailed.
export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const SMTP_FROM = process.env.SMTP_FROM || "GadgetHub <no-reply@gadgethub.local>";

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
