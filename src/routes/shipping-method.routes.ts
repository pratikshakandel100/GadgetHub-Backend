import { Router } from "express";
import { ShippingMethodController } from "../controller/shipping-method.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const shippingMethodRouter = Router();
const shippingMethodController = new ShippingMethodController();

shippingMethodRouter.get(
    "/active",
    authorizedMiddleware,
    shippingMethodController.getActiveShippingMethods
);

shippingMethodRouter.post(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    shippingMethodController.createShippingMethod
);

shippingMethodRouter.get(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    shippingMethodController.getAllShippingMethods
);

shippingMethodRouter.get(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    shippingMethodController.getShippingMethodById
);

shippingMethodRouter.put(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    shippingMethodController.updateShippingMethod
);

shippingMethodRouter.delete(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    shippingMethodController.deleteShippingMethod
);

export default shippingMethodRouter;
