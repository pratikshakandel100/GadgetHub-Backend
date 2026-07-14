import { UserController } from "../controller/user.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const adminUserRouter = Router();
const userController = new UserController();

adminUserRouter.get(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    userController.getAllUsers
);

adminUserRouter.get(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    userController.getUserById
);

adminUserRouter.post(
    "/",
    authorizedMiddleware,
    adminMiddleware,
    userController.createUserByAdmin
);

adminUserRouter.put(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    userController.updateUserByAdmin
);

adminUserRouter.delete(
    "/:id",
    authorizedMiddleware,
    adminMiddleware,
    userController.deleteUserByAdmin
);

export default adminUserRouter;
