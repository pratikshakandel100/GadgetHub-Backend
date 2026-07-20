import { Router } from "express";
import { WishlistController } from "../controller/wishlist.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const wishlistRouter = Router();
const wishlistController = new WishlistController();

wishlistRouter.get("/", authorizedMiddleware, wishlistController.getWishlist);
wishlistRouter.post("/", authorizedMiddleware, wishlistController.addToWishlist);
wishlistRouter.delete("/:productId", authorizedMiddleware, wishlistController.removeFromWishlist);

export default wishlistRouter;
