import { Router } from "express";
import { ProductController } from "../controller/product.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { uploads } from "../middlewares/upload.middleware";

const productRouter = Router();
const productController = new ProductController();

// Admin routes - require authentication and admin role
productRouter.post(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    uploads.fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'galleryImages', maxCount: 5 },
        { name: 'thumbnailImage', maxCount: 1 }
    ]),
    productController.createProduct
);

productRouter.post(
    "/bulk",
    authorizedMiddleware,
    adminMiddleware,
    productController.bulkCreateProducts
);

productRouter.get(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    productController.getAllProducts
);

productRouter.get(
    "/published",
    productController.getPublishedProducts
);

productRouter.get(
    "/published/:id",
    productController.getPublishedProductById
);

productRouter.get(
    "/compare",
    productController.getPublishedProductsByIds
);

productRouter.get(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    productController.getProductById
);

productRouter.put(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    uploads.fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'galleryImages', maxCount: 5 },
        { name: 'thumbnailImage', maxCount: 1 }
    ]),
    productController.updateProduct
);

productRouter.patch(
    "/:id/status",
    authorizedMiddleware,
    adminMiddleware,
    productController.updateStatus
);

productRouter.delete(
    "/bulk",
    authorizedMiddleware,
    adminMiddleware,
    productController.bulkDeleteProducts
);

productRouter.delete(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    productController.deleteProduct
);

export default productRouter;
