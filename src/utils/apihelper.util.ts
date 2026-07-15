import { Response } from "express";
import { HateoasLinks } from "./hateoas.util";

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
}

export interface ApiResponse<T> {
    status: number;
    success: boolean;
    message: string;
    data: T;
    meta?: PaginationMeta; // optional
    _links?: HateoasLinks; // optional HATEOAS links
}

export interface ApiResponseOptions {
    links?: HateoasLinks;
    location?: string;
    cacheControl?: string;
}

export class ApiResponseHelper {
    static success<T>(
        res: Response,
        data: T,
        message: string = "Success",
        status: number = 200,
        meta?: PaginationMeta,
        options?: ApiResponseOptions
    ): Response {
        if (options?.location) res.set("Location", options.location);
        if (options?.cacheControl) res.set("Cache-Control", options.cacheControl);

        const response: ApiResponse<T> = {
            status,
            success: true,
            message,
            data,
            meta,
            _links: options?.links
        }
        return res.status(status).json(response);
    }
    static error(
        res: Response,
        message: string = "Error",
        status: number = 500,
        data?: null
    ): Response {
        const response: ApiResponse<null> = {
            status,
            success: false,
            message,
            data
        }
        return res.status(status).json(response);
    }
}
