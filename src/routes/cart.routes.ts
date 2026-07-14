import { Router } from "express";
import { CartController } from "../controller/cart.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const cartRouter = Router();
const cartController = new CartController();

cartRouter.get("/", authorizedMiddleware, cartController.getCart);
cartRouter.post("/", authorizedMiddleware, cartController.addToCart);
cartRouter.put("/:productId", authorizedMiddleware, cartController.updateCartItem);
cartRouter.delete("/:productId", authorizedMiddleware, cartController.removeFromCart);
cartRouter.delete("/", authorizedMiddleware, cartController.clearCart);

export default cartRouter;
