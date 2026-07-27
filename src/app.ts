import express, { Application, NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import jwt from "jsonwebtoken";
import { HttpException } from "./exceptions/http-exception";
import { ApiResponseHelper } from "./utils/apihelper.util";
import { conditionalGetMiddleware } from "./middlewares/conditionalGet.middleware";
import { LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MINUTES, SECRET_KEY } from "./config/constant";
import userRouter from "./routes/user.routes";
import adminUserRouter from "./routes/admin.routes";
import productRouter from "./routes/product.routes";
import categoryRouter from "./routes/category.routes";
import subcategoryRouter from "./routes/subcategory.routes";
import brandRouter from "./routes/brand.routes";
import cartRouter from "./routes/cart.routes";
import wishlistRouter from "./routes/wishlist.routes";
import orderRouter from "./routes/order.routes";
import shippingAddressRouter from "./routes/shipping-address.routes";
import shippingMethodRouter from "./routes/shipping-method.routes";
import shippingSettingsRouter from "./routes/shipping-settings.routes";
import notificationRouter from "./routes/notification.routes";
import dashboardRouter from "./routes/dashboard.routes";
import inventoryRouter from "./routes/inventory.routes";
import reviewRouter from "./routes/review.routes";
import aiRouter from "./routes/ai.routes";
import recommendationRouter from "./routes/recommendation.routes";
import cors from "cors";
import morgan from "morgan";
import path from "path";

const app: Application = express();

// 1. Fixed the optionsSuccessStatus typo
const corsOptions = {
    origin: "*", // Use string "*" instead of an array containing "*" for general wildcard matches
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "If-None-Match",
        "If-Match",
        "If-Modified-Since",
        "If-Unmodified-Since"
    ],
    exposedHeaders: [
        "ETag",
        "Location",
        "Last-Modified",
        "Link",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset"
    ],
    optionsSuccessStatus: 200 // Fixed typo here
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("combined"));
app.use(conditionalGetMiddleware);

// Browser requests all arrive via the frontend's server-side proxy, so every
// user shares one source IP as far as Express is concerned. Key by the
// logged-in user instead so one account's traffic can't eat another's
// budget; only requests without a valid token fall back to IP.
const getCookieToken = (cookieHeader?: string): string | undefined => {
    if (!cookieHeader) return undefined;
    const authCookie = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith("auth_token="));
    return authCookie ? decodeURIComponent(authCookie.split("=")[1] || "") : undefined;
};

const rateLimitKeyGenerator = (req: Request): string => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    const token = bearerToken || getCookieToken(req.headers.cookie);
    if (token) {
        try {
            const decoded = jwt.verify(token, SECRET_KEY) as Record<string, any>;
            if (decoded?.id) return `user:${decoded.id}`;
        } catch {
            // fall through to IP-based key
        }
    }
    return ipKeyGenerator(req.ip || "");
};

// Generous general rate limit — shouldn't interfere with normal dev/testing traffic.
const generalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKeyGenerator,
    message: { status: 429, success: false, message: "Too many requests, please try again later.", data: null }
});
// IP-level backstop against one IP spraying many different accounts. Kept
// separate from login's own limiter below — sharing one counter across
// login+register+google would let register/google traffic eat into the
// login budget (and vice versa) for no reason, since they're different
// abuse shapes.
const authLimiter = rateLimit({
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    limit: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: `Too many attempts, please try again in ${LOGIN_RATE_LIMIT_WINDOW_MINUTES} minutes.`, data: null }
});
// Login gets its own counter, distinct from authLimiter, so it doesn't
// share a budget with register/google/forgot-password traffic. This is the
// IP-level backstop; per-account lockout (a tighter, more specific 5
// attempts) lives in user.service.ts and is what actually engages first
// for repeated bad passwords on one account.
const loginLimiter = rateLimit({
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    limit: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: `Too many login attempts. Please try again in ${LOGIN_RATE_LIMIT_WINDOW_MINUTES} minutes.`, data: null }
});
// AI chat calls a paid LLM per request — much tighter than the general limiter.
const aiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: "Too many AI requests, please try again later.", data: null }
});
// Per-IP throttle on the password-reset flow (separate bucket from login/register so the two
// don't compete). Per-email cooldown/cap is enforced separately inside UserService.
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: "Too many requests, please try again later.", data: null }
});
app.use(generalLimiter);
app.use("/api/v1/auth/login", loginLimiter);
app.use("/api/v1/auth/register", authLimiter);
app.use("/api/v1/auth/google", authLimiter);
app.use("/api/v1/auth/forgot-password", passwordResetLimiter);
app.use("/api/v1/auth/verify-reset-otp", passwordResetLimiter);
app.use("/api/v1/auth/reset-password", passwordResetLimiter);
// Forgot-password sends an email per request — same abuse shape as
// register/google (not login), so it shares that limiter instead.
app.use("/api/v1/auth/forgot-password", authLimiter);
app.use("/api/v1/ai", aiLimiter);

// 2. Your API registration is perfectly fine
app.use("/api/v1/auth", userRouter);
app.use("/api/v1/admin/users", adminUserRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/subcategories", subcategoryRouter);
app.use("/api/v1/brands", brandRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/shipping-addresses", shippingAddressRouter);
app.use("/api/v1/shipping-methods", shippingMethodRouter);
app.use("/api/v1/shipping-settings", shippingSettingsRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin/dashboard", dashboardRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/recommendations", recommendationRouter);

// See src/routes/e2e-test.routes.ts — only ever mounted for Playwright runs.
if (process.env.E2E_TEST_MODE === "true") {
    const e2eTestRouter = require("./routes/e2e-test.routes").default;
    app.use("/api/v1/__e2e__", e2eTestRouter);
}

// 3. Made static path resolution bulletproof using process.cwd() (project root)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"))); 

// Global 404 handler
app.use((req: Request, res: Response) => {
    return res.status(404).json({ message: "API endpoint not found" });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err);
    if (err instanceof HttpException) {
        return ApiResponseHelper.error(res, err.message, err.status);
    }
    return ApiResponseHelper.error(res, err?.message || "Internal Server Error", 500);
});

export default app;