import { Router } from "express";
import { ReviewController } from "../controller/review.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const reviewRouter = Router();
const reviewController = new ReviewController();

reviewRouter.post("/", authorizedMiddleware, reviewController.createReview);
reviewRouter.get("/my", authorizedMiddleware, reviewController.getMyReviews);
reviewRouter.get("/admin/all", authorizedMiddleware, adminMiddleware, reviewController.getAllReviews);
reviewRouter.patch("/:id/status", authorizedMiddleware, adminMiddleware, reviewController.updateReviewStatus);
reviewRouter.delete("/:id", authorizedMiddleware, adminMiddleware, reviewController.deleteReview);

export default reviewRouter;
