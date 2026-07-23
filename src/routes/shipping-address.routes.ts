import { Router } from "express";
import { ShippingAddressController } from "../controller/shipping-address.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const shippingAddressRouter = Router();
const shippingAddressController = new ShippingAddressController();

shippingAddressRouter.get("/", authorizedMiddleware, shippingAddressController.getAddresses);
shippingAddressRouter.post("/", authorizedMiddleware, shippingAddressController.createAddress);
shippingAddressRouter.get("/:id", authorizedMiddleware, shippingAddressController.getAddressById);
shippingAddressRouter.put("/:id", authorizedMiddleware, shippingAddressController.updateAddress);
shippingAddressRouter.delete("/:id", authorizedMiddleware, shippingAddressController.deleteAddress);
shippingAddressRouter.patch("/:id/default", authorizedMiddleware, shippingAddressController.setDefaultAddress);

export default shippingAddressRouter;
