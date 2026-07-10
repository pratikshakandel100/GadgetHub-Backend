import { Router } from "express";
import { CategoryController } from "../controller/category.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const categoryRouter = Router();
const categoryController = new CategoryController();

categoryRouter.post(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.createCategory
);

categoryRouter.get(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.getAllCategories
);

categoryRouter.get(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.getCategoryById
);

categoryRouter.put(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.updateCategory
);

categoryRouter.delete(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.deleteCategory
);

export default categoryRouter;
