import { Router } from "express";
import { DashboardController } from "../controller/dashboard.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const dashboardRouter = Router();
const dashboardController = new DashboardController();

dashboardRouter.get("/", authorizedMiddleware, adminMiddleware, dashboardController.getDashboard);

export default dashboardRouter;
