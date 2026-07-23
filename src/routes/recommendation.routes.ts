import { Router } from "express";
import { RecommendationController } from "../controller/recommendation.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const recommendationRouter = Router();
const recommendationController = new RecommendationController();

recommendationRouter.get(
    "/recommended",
    authorizedMiddleware,
    recommendationController.getRecommendedForUser
);

recommendationRouter.get(
    "/frequently-bought/:productId",
    recommendationController.getFrequentlyBoughtTogether
);

export default recommendationRouter;
