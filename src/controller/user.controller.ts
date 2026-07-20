import { UserService } from "../services/user.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import {z} from 'zod';
import { Request, Response } from "express";
import { CreateUserDTO, LoginUserDTO, UpdateUserDTO, AdminCreateUserDTO, AdminUpdateUserDTO, GoogleAuthDTO } from "../dtos/user.dto";

const userService = new UserService();

const sanitizeUser = (user: any) => {
    const plainUser = typeof user?.toObject === "function" ? user.toObject() : user;
    if (!plainUser) return plainUser;
    const { password, ...safeUser } = plainUser;
    return safeUser;
}

export class UserController{
    async createUser(req: Request, res: Response){
        try{
          const userData = CreateUserDTO.safeParse(req.body);
          if(!userData.success){
            return ApiResponseHelper.error(res, z.prettifyError(userData.error), 400)
          }
          const user = await userService.createUser(userData.data);
            return ApiResponseHelper.success(res, sanitizeUser(user), "User created successfully");
        } catch(error: Error|any|unknown){
          return ApiResponseHelper.error(
            res,
            error.message || "Internal Server Error",
            error.status || 500
          );
        }
    }
    async loginUser(req: Request, res: Response){
        try{
            const parsedData = LoginUserDTO.safeParse(req.body);
            if(!parsedData.success){
                return ApiResponseHelper
                .error(res, z.prettifyError(parsedData.error), 400)
            }
            const {user, token} = await userService.loginUser(parsedData.data);
            return ApiResponseHelper.success(res, {user: sanitizeUser(user),token}, "Login Successfull");
        } catch(error: Error|any|unknown){
           return ApiResponseHelper.error(
            res,
            error.message || "Internal Server Error",
            error.status || 500
           );
        }
    }


    async googleLogin(req: Request, res: Response){
        try{
            const parsedData = GoogleAuthDTO.safeParse(req.body);
            if(!parsedData.success){
                return ApiResponseHelper
                .error(res, z.prettifyError(parsedData.error), 400)
            }
            const {user, token} = await userService.googleLogin(parsedData.data.idToken);
            return ApiResponseHelper.success(res, {user: sanitizeUser(user), token}, "Google login successful");
        } catch(error: Error|any|unknown){
           return ApiResponseHelper.error(
            res,
            error.message || "Internal Server Error",
            error.status || 500
           );
        }
    }

    async whoami(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) {
                return ApiResponseHelper.error(res, "User not found", 404);
            }
            return ApiResponseHelper.success(res, sanitizeUser(user), "User details fetched successfully");
        }
        catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            console.log("Update request body:", req.body);
            console.log("Update request file:", req.file);
            
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const userData = UpdateUserDTO.safeParse(req.body);
            if (!userData.success) {
                console.log("DTO validation errors:", userData.error);
                return ApiResponseHelper
                    .error(res, z.prettifyError(userData.error), 400);
            }

            if (req.file) {
                userData.data.profileImage = "/uploads/" + req.file.filename; // add profileImage path to body
            }
            const updatedUser = await userService.updateUser(userId, userData.data);
            return ApiResponseHelper.success(res, sanitizeUser(updatedUser), "User updated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(
                res,
                error.message || "Internal Server Error",
                error.status || 500
            );
        }
    }
    

async getAllUsers(req: Request, res: Response) {
    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = (req.query.search as string) || "";

        const result = await userService.getAllUsers(
            page,
            limit,
            search
        );

        return res.status(200).json({
            success: true,
            message: "All users fetched successfully",
            data: result.users.map(user => sanitizeUser(user)),
            meta: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });

    } catch (error: any) {
        return ApiResponseHelper.error(
            res,
            error.message || "Internal Server Error",
            error.status || 500
        );
    }
}

async deleteUserByAdmin(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        await userService.deleteUser(id);
        
        return ApiResponseHelper.success(res, {}, "User deleted successfully by admin");
    } catch (error: any) {
        return ApiResponseHelper.error(
            res, 
            error.message || "Internal Server Error", 
            error.status || 500
        );
    }
}


 async getUserById(
    req: Request<{ id: string }>,
    res: Response
) {
    try {

        const user = await userService.getUserById(req.params.id);

        return ApiResponseHelper.success(
            res,
            sanitizeUser(user),
            "User fetched successfully"
        );

    } catch (error: any) {

        return ApiResponseHelper.error(
            res,
            error.message || "Internal Server Error",
            error.status || 500
        );

    }
}

async updateUserByAdmin(
    req: Request<{ id: string }>,
    res: Response
) {
    try {
        const parsed = AdminUpdateUserDTO.safeParse(req.body);
        if (!parsed.success) {
            return ApiResponseHelper.error(
                res,
                z.prettifyError(parsed.error),
                400
            );
        }

        const user = await userService.updateUserByAdmin(
            req.params.id,
            parsed.data
        );

        return ApiResponseHelper.success(
            res,
            sanitizeUser(user),
            "User updated successfully"
        );

    } catch (error: any) {

        return ApiResponseHelper.error(
            res,
            error.message || "Internal Server Error",
            error.status || 500
        );

    }
}


async createUserByAdmin(req:Request,res:Response){

    try{

        const parsed = AdminCreateUserDTO.safeParse(req.body);

        if(!parsed.success){

            return ApiResponseHelper.error(
                res,
                z.prettifyError(parsed.error),
                400
            );

        }

        const user = await userService.createUserByAdmin(
            parsed.data
        );

        return ApiResponseHelper.success(
            res,
            sanitizeUser(user),
            "User created successfully"
        );

    }catch(error:any){

        return ApiResponseHelper.error(
            res,
            error.message,
            error.status||500
        );

    }

}
    async logoutUser(req: Request, res: Response) {
        return ApiResponseHelper.success(res, null, "Logout successful");
    }
}
