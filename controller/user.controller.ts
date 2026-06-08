import { UserService } from "../services/user.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import {z} from 'zod';
import { Request, Response } from "express";
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";

const userService = new UserService();

export class UserController{
    async createUser(req: Request, res: Response){
        try{
          const userData = CreateUserDTO.safeParse(req.body);
          if(!userData.success){
            return ApiResponseHelper.error(res, z.prettifyError(userData.error), 400)
          }
          const user = await userService.createUser(userData.data);
          return ApiResponseHelper.success(res, user, "User created successfully");
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
            return ApiResponseHelper.success(res, {user,token}, "Login Successfull");
        } catch(error: Error|any|unknown){
           return ApiResponseHelper.error(
            res,
            error.message || "Internal Server Error",
            error.status || 500
           );
        }
    }
}
