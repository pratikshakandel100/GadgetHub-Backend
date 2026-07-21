import crypto from "crypto";
import { Request } from "express";
import { HttpException } from "../exceptions/http-exception";

export const computeStrongEtag = (payload: unknown): string => {
    const hash = crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex");
    return `"${hash}"`;
};

const matchesAny = (headerValue: string, etag: string): boolean => {
    if (headerValue.trim() === "*") return true;
    return headerValue.split(",").map((v) => v.trim()).includes(etag);
};

/**
 * Guards a mutating request (PUT/PATCH/DELETE) against lost updates: if the
 * client sent If-Match or If-Unmodified-Since and the current entity no longer
 * matches, throws 412 instead of letting the write proceed. No-ops when the
 * client sends neither header, so callers that don't opt in are unaffected.
 */
export const assertNotStale = (req: Request, current: { updatedAt?: Date }): void => {
    const ifMatch = req.headers["if-match"];
    if (typeof ifMatch === "string") {
        const currentEtag = computeStrongEtag(current);
        if (!matchesAny(ifMatch, currentEtag)) {
            throw new HttpException(412, "Precondition Failed: resource has changed since it was last fetched");
        }
        return;
    }

    const ifUnmodifiedSince = req.headers["if-unmodified-since"];
    if (typeof ifUnmodifiedSince === "string" && current.updatedAt) {
        const sinceDate = new Date(ifUnmodifiedSince);
        if (!Number.isNaN(sinceDate.getTime()) && current.updatedAt.getTime() > sinceDate.getTime()) {
            throw new HttpException(412, "Precondition Failed: resource has changed since it was last fetched");
        }
    }
};
