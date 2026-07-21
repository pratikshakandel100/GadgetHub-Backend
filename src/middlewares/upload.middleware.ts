import multer from "multer";
import path from "path";
import { Request } from "express";
import { HttpException } from "../exceptions/http-exception";
import fs from "fs";
import crypto from "crypto";

const storage = multer.diskStorage(
    {
        destination: (
            req: Request, 
            file: Express.Multer.File, 
            cb: (error: Error | null, destination: string) => void
        ) => {
            const uploadPath = path.join(__dirname, "../../uploads"); // __dirname -> current dir
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath); // create uploads dir if not exists
            }
            cb(null, uploadPath); // save to uploads dir
        },
        filename: (
            req: Request, 
            file: Express.Multer.File, 
            cb: (error: Error | null, filename: string) => void
        ) => {
            const fileSuffix = crypto.randomUUID(); // unique suffix
            cb(null, fileSuffix + "-" + file.originalname.replace(/\s+/g, "-")); // unique filename
        }
    }
);

// SVG is deliberately excluded even though it's `image/*` — it can carry inline
// <script>/event-handler payloads, so accepting it here would let an upload
// become stored XSS wherever the file is later served or embedded.
const BLOCKED_IMAGE_MIMETYPES = ["image/svg+xml"];

const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    if (file.mimetype.startsWith("image/") && !BLOCKED_IMAGE_MIMETYPES.includes(file.mimetype)) {
        cb(null, true); // accept file
    } else {
        cb(new HttpException(400, "Only image files are allowed (SVG is not supported)")); // reject file
    }
}
const upload = multer(
    {
        storage,
        limits: {
            fileSize: 1024 * 1024 * 5 // 5MB limit
        },
        fileFilter
    }
);

export const uploads = {
    single: (
        fieldName: string
    ) => upload.single(fieldName),
    array: (
        fieldName: string, 
        maxCount: number
    ) => upload.array(fieldName, maxCount),
    fields: (
        fieldsArray: {
            name: string, 
            maxCount?: number 
        }[]
    ) => upload.fields(fieldsArray)
}
