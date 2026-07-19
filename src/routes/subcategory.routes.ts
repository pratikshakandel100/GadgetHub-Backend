import { Router } from "express";
import { SubcategoryController } from "../controller/subcategory.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const subcategoryRouter = Router();
const subcategoryController = new SubcategoryController();

subcategoryRouter.post(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    subcategoryController.createSubcategory
);

subcategoryRouter.get(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    subcategoryController.getAllSubcategories
);

subcategoryRouter.get(
    "/published",
    subcategoryController.getPublishedSubcategories
);

subcategoryRouter.get(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    subcategoryController.getSubcategoryById
);

subcategoryRouter.put(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    subcategoryController.updateSubcategory
);

subcategoryRouter.delete(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    subcategoryController.deleteSubcategory
);

export default subcategoryRouter;
