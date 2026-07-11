import express, { Application, NextFunction, Request, Response } from "express";
import { HttpException } from "./exceptions/http-exception";
import { ApiResponseHelper } from "./utils/apihelper.util";
import userRouter from "./routes/user.routes";
import adminUserRouter from "./routes/admin.routes";
import productRouter from "./routes/product.routes";
import categoryRouter from "./routes/category.routes";
import brandRouter from "./routes/brand.routes";
import cartRouter from "./routes/cart.routes";
import wishlistRouter from "./routes/wishlist.routes";
import orderRouter from "./routes/order.routes";
import cors from "cors";
import morgan from "morgan";
import path from "path";

const app: Application = express();

// 1. Fixed the optionsSuccessStatus typo
const corsOptions = {
    origin: "*", // Use string "*" instead of an array containing "*" for general wildcard matches
    optionsSuccessStatus: 200 // Fixed typo here
};
app.use(cors(corsOptions)); 

app.use(express.json()); 
app.use(express.urlencoded({ extended: true, limit: "50mb" })); 
app.use(morgan("combined")); 

// 2. Your API registration is perfectly fine
app.use("/api/v1/auth", userRouter);
app.use("/api/v1/admin/users", adminUserRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/brands", brandRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/orders", orderRouter);

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