import { UserController } from "../controller/user.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { uploads } from "../middlewares/upload.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

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



//admin route'

// userRouter.get("/admin/users", authorizedMiddleware, adminMiddleware, userController.getAllUsers);
// userRouter.delete("/admin/user/:id", authorizedMiddleware, adminMiddleware, userController.deleteUserByAdmin);


// Admin Routes

// Get all users
userRouter.get(
    "/admin/users",
    authorizedMiddleware,
    adminMiddleware,
    userController.getAllUsers
);

// Get one user
userRouter.get(
    "/admin/users/:id",
    authorizedMiddleware,
    adminMiddleware,
    userController.getUserById
);

// Create user
userRouter.post(
    "/admin/users",
    authorizedMiddleware,
    adminMiddleware,
    userController.createUserByAdmin
);

// Update user
userRouter.put(
    "/admin/users/:id",
    authorizedMiddleware,
    adminMiddleware,
    userController.updateUserByAdmin
);

// Delete user
userRouter.delete(
    "/admin/users/:id",
    authorizedMiddleware,
    adminMiddleware,
    userController.deleteUserByAdmin
);


export default userRouter;
