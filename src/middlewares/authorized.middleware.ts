import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/user.model';
import { UserMongoRepository } from '../repositories/user.repository';
import { HttpException } from '../exceptions/http-exception';
import { ApiResponseHelper } from '../utils/apihelper.util';
import { SECRET_KEY } from '../config/constant';

declare global {
    namespace Express {
        interface Request {
            user?: Record<string, any> | IUser
        }
    }
} 
let userRepository = new UserMongoRepository();

const getTokenFromCookieHeader = (cookieHeader?: string) => {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const authCookie = cookies.find((cookie) => cookie.startsWith("auth_token="));
    return authCookie ? decodeURIComponent(authCookie.split("=")[1] || "") : null;
}

const getTokenFromRequest = (req: Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }
    return getTokenFromCookieHeader(req.headers.cookie);
}

export const authorizedMiddleware =
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = getTokenFromRequest(req);
            console.log('Auth middleware - Token found:', !!token);
            if (!token) throw new HttpException(401, 'Please login to continue');
            const decodedToken = jwt.verify(token, SECRET_KEY) as Record<string, any>;
            console.log('Auth middleware - Decoded token:', decodedToken);
            if (!decodedToken || !decodedToken.id) {
                throw new HttpException(401, 'Invalid or expired login session');
            } // make function async
            const user = await userRepository.findById(decodedToken.id);
            console.log('Auth middleware - User found:', !!user, 'User role:', user?.role);
            if (!user) throw new HttpException(401, 'Login session user not found');
            req.user = user; // attach user to request (like tag)
            return next();
        } catch (err: Error | any) {
            console.log('Auth middleware - Error:', err.name, err.message);
            const status = err.name === "JsonWebTokenError" || err.name === "TokenExpiredError"
                ? 401
                : err.status || 500;
            return ApiResponseHelper.error(
                res,
                status === 401 ? 'Invalid or expired login session' : err.message || 'Internal Server Error',
                status
            );
        }
    }

