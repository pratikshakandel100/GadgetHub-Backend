import { mergeUploadedImage, mergeUploadedImages } from "../../../src/utils/upload.util";
import type { Request } from "express";

describe("mergeUploadedImage", () => {
    it("leaves the body untouched when no file was uploaded", () => {
        const req = { body: { name: "Dell" } } as unknown as Request;
        expect(mergeUploadedImage(req)).toEqual({ name: "Dell" });
    });

    it("adds the uploaded file's path under the default 'image' field", () => {
        const req = { body: { name: "Dell" }, file: { filename: "logo.png" } } as unknown as Request;
        expect(mergeUploadedImage(req)).toEqual({ name: "Dell", image: "/uploads/logo.png" });
    });

    it("uses a custom body field name when given", () => {
        const req = { body: {}, file: { filename: "cover.png" } } as unknown as Request;
        expect(mergeUploadedImage(req, "coverImage")).toEqual({ coverImage: "/uploads/cover.png" });
    });
});

describe("mergeUploadedImages", () => {
    it("returns the body unchanged when no files were uploaded", () => {
        const req = { body: { name: "Product" } } as unknown as Request;
        expect(mergeUploadedImages(req, [{ field: "mainImage" }])).toEqual({ name: "Product" });
    });

    it("merges a single-file field as a string path", () => {
        const req = {
            body: {},
            files: { mainImage: [{ filename: "main.png" }] },
        } as unknown as Request;
        expect(mergeUploadedImages(req, [{ field: "mainImage" }])).toEqual({ mainImage: "/uploads/main.png" });
    });

    it("merges a multiple-file field as an array of paths", () => {
        const req = {
            body: {},
            files: { galleryImages: [{ filename: "a.png" }, { filename: "b.png" }] },
        } as unknown as Request;
        expect(mergeUploadedImages(req, [{ field: "galleryImages", multiple: true }])).toEqual({
            galleryImages: ["/uploads/a.png", "/uploads/b.png"],
        });
    });

    it("skips a field spec that has no matching uploaded files", () => {
        const req = { body: { name: "Product" }, files: {} } as unknown as Request;
        expect(mergeUploadedImages(req, [{ field: "mainImage" }])).toEqual({ name: "Product" });
    });
});
