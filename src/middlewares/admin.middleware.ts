import { Request, Response } from "express";
import { NextFunction } from "express";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";

export  async function adminMiddleware(req: Request, res: Response, next: NextFunction){
 try{
       console.log('Admin middleware - User:', req.user);
       if(!req.user){
         throw new HttpException(401, "Unauthorised. Please login first");
       }
       if(req.user.role !== 'admin'){
        console.log('Admin middleware - Role check failed. User role:', req.user.role);
        throw new HttpException(403, "Access Denied. Admin only");
       }
       console.log('Admin middleware - Access granted');
       return next();
 }catch(error: any){
     return ApiResponseHelper.error(
       res,
       error.message || 'Internal server error',
       error.status || 500
     )
 }

}
