import express, { Application, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { HttpException } from "./exceptions/http-exception";
import { ApiResponseHelper } from "./utils/apihelper.util";
import { conditionalGetMiddleware } from "./middlewares/conditionalGet.middleware";
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
import paymentRouter from "./routes/payment.routes";
import notificationRouter from "./routes/notification.routes";
import dashboardRouter from "./routes/dashboard.routes";
import inventoryRouter from "./routes/inventory.routes";
import reviewRouter from "./routes/review.routes";
import aiRouter from "./routes/ai.routes";
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

// Generous general rate limit — shouldn't interfere with normal dev/testing traffic.
const generalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: "Too many requests, please try again later.", data: null }
});
// Stricter limit on login/register specifically, to blunt brute-force attempts.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: "Too many attempts, please try again later.", data: null }
});
// AI chat calls a paid LLM per request — much tighter than the general limiter.
const aiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: "Too many AI requests, please try again later.", data: null }
});
app.use(generalLimiter);
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);
app.use("/api/v1/auth/google", authLimiter);
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
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin/dashboard", dashboardRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/ai", aiRouter);

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