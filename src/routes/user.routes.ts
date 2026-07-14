import { UserController } from "../controller/user.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { uploads } from "../middlewares/upload.middleware";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/register", userController.createUser);
userRouter.post("/login", userController.loginUser);
userRouter.post("/logout", authorizedMiddleware, userController.logoutUser);

userRouter.get("/whoami",
    authorizedMiddleware,
    userController.whoami
);

userRouter.put("/update",
    authorizedMiddleware, // handle authentication and set req.user
    uploads.single("profileImage"), // handle profile image upload
    userController.updateUser
);

export default userRouter;
