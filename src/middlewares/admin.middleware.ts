import { Request, Response } from "express";
import { NextFunction } from "express";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";

export  async function adminMiddleware(req: Request, res: Response, next: NextFunction){
 try{
       if(!req.user){
         throw new HttpException(401, "Unauthorised. Please login first");
       }
       if(req.user.role !== 'admin'){
        throw new HttpException(403, "Access Denied. Admin only");
       }
       return next();
 }catch(error: any){
     return ApiResponseHelper.error(
       res,
       error.message || 'Internal server error',
       error.status || 500
     )
 }

}
