import { Router } from "express";
import { BrandController } from "../controller/brand.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { uploads } from "../middlewares/upload.middleware";

const brandRouter = Router();
const brandController = new BrandController();

brandRouter.post(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    uploads.single("image"),
    brandController.createBrand
);

brandRouter.post(
    "/bulk",
    authorizedMiddleware,
    adminMiddleware,
    brandController.bulkCreateBrands
);

brandRouter.get(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    brandController.getAllBrands
);

brandRouter.get(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    brandController.getBrandById
);

brandRouter.put(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    uploads.single("image"),
    brandController.updateBrand
);

brandRouter.delete(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    brandController.deleteBrand
);

export default brandRouter;
