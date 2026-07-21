import { UserController } from "../controller/user.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { uploads } from "../middlewares/upload.middleware";

const userRouter = Router();
const userController = new UserController();

// Rate limiting for /login, /register, /google, /forgot-password is applied
// at the app level (see app.ts's authLimiter) since it needs to match on the
// mounted path prefix before this router's own routes take over.
userRouter.post("/register", userController.createUser);
userRouter.post("/login", userController.loginUser);
userRouter.post("/google", userController.googleLogin);
userRouter.post("/refresh", userController.refreshToken);
// No authorizedMiddleware here — logout just needs to revoke the refresh
// token, and must still work even if the access token has already expired.
userRouter.post("/logout", userController.logoutUser);
userRouter.post("/forgot-password", userController.forgotPassword);
userRouter.post("/reset-password", userController.resetPassword);

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
