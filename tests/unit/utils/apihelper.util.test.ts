import { ApiResponseHelper } from "../../../src/utils/apihelper.util";
import type { Response } from "express";

const makeRes = (): Response => {
    const res: any = {};
    res.set = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
};

describe("ApiResponseHelper.success", () => {
    it("defaults to status 200 and a generic message", () => {
        const res = makeRes();
        ApiResponseHelper.success(res, { id: 1 });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 200, success: true, message: "Success", data: { id: 1 } })
        );
    });

    it("uses the given status and message", () => {
        const res = makeRes();
        ApiResponseHelper.success(res, { id: 1 }, "Created", 201);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 201, message: "Created" }));
    });

    it("sets Location and Cache-Control headers when provided", () => {
        const res = makeRes();
        ApiResponseHelper.success(res, {}, "OK", 200, undefined, { location: "/api/v1/products/1", cacheControl: "no-store" });
        expect(res.set).toHaveBeenCalledWith("Location", "/api/v1/products/1");
        expect(res.set).toHaveBeenCalledWith("Cache-Control", "no-store");
    });
});

describe("ApiResponseHelper.error", () => {
    it("defaults to status 500, success false, and null data", () => {
        const res = makeRes();
        ApiResponseHelper.error(res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 500, success: false, message: "Error", data: undefined })
        );
    });

    it("uses the given message and status", () => {
        const res = makeRes();
        ApiResponseHelper.error(res, "Not found", 404);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Not found" }));
    });
});
