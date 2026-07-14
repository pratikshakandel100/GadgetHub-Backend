import { Router } from "express";
import { CategoryController } from "../controller/category.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { uploads } from "../middlewares/upload.middleware";

const categoryRouter = Router();
const categoryController = new CategoryController();

categoryRouter.post(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    uploads.single("image"),
    categoryController.createCategory
);

categoryRouter.get(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.getAllCategories
);

categoryRouter.get(
    "/published",
    categoryController.getPublishedCategories
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
    uploads.single("image"),
    categoryController.updateCategory
);

categoryRouter.get(
    "/:id/attributes",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.getCategoryAttributes
);

categoryRouter.post(
    "/:id/attributes",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.updateCategoryAttributes
);

categoryRouter.delete(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    categoryController.deleteCategory
);

export default categoryRouter;
