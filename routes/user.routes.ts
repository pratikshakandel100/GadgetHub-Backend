import { UserController } from "../controller/user.controller";
import { Router } from "express";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/register", userController.createUser);
userRouter.post("/login", userController.loginUser);

export default userRouter;