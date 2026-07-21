import { Request } from "express";

/** Merges a single uploaded file (via `uploads.single(fieldName)`) into the request body under `bodyField`. */
export const mergeUploadedImage = (req: Request, bodyField: string = "image") => {
    const body = { ...req.body };
    if (req.file) {
        body[bodyField] = "/uploads/" + req.file.filename;
    }
    return body;
};

export interface UploadFieldSpec {
    field: string;
    multiple?: boolean;
}

/** Merges files uploaded via `uploads.fields([...])` into the request body, one entry per field spec. */
export const mergeUploadedImages = (req: Request, fields: UploadFieldSpec[]) => {
    const body = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (!files) return body;

    for (const { field, multiple } of fields) {
        const matched = files[field];
        if (!matched || matched.length === 0) continue;
        body[field] = multiple
            ? matched.map((file) => "/uploads/" + file.filename)
            : "/uploads/" + matched[0].filename;
    }
    return body;
};
