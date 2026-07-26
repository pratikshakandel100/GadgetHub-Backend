import { Router } from "express";
import { ShippingSettingsController } from "../controller/shipping-settings.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const shippingSettingsRouter = Router();
const shippingSettingsController = new ShippingSettingsController();

shippingSettingsRouter.get(
    "/",
    authorizedMiddleware,
    shippingSettingsController.getSettings
);

shippingSettingsRouter.put(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    shippingSettingsController.updateSettings
);

shippingSettingsRouter.post(
    "/quote",
    authorizedMiddleware,
    shippingSettingsController.getQuote
);

export default shippingSettingsRouter;
