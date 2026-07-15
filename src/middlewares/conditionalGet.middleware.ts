import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

const computeEtag = (body: unknown): string => {
    const hash = crypto.createHash("sha1").update(JSON.stringify(body)).digest("hex");
    return `"${hash}"`;
};

const toDate = (value: unknown): Date | null => {
    if (!value) return null;
    const date = new Date(value as string);
    return Number.isNaN(date.getTime()) ? null : date;
};

/** Best-effort Last-Modified: max `updatedAt` across a list, or a single entity's `updatedAt`. */
const extractLastModified = (body: any): Date | null => {
    const data = body?.data;
    if (!data) return null;

    if (Array.isArray(data)) {
        const dates = data.map((item) => toDate(item?.updatedAt)).filter((d): d is Date => !!d);
        if (dates.length === 0) return null;
        return new Date(Math.max(...dates.map((d) => d.getTime())));
    }
    return toDate(data.updatedAt);
};

const matchesIfNoneMatch = (header: string, etag: string): boolean => {
    if (header.trim() === "*") return true;
    return header.split(",").map((v) => v.trim()).includes(etag);
};

/**
 * Global conditional-GET support: shadows `res.json` for GET/HEAD requests only,
 * computing a strong ETag (and a best-effort Last-Modified) from the outgoing
 * body, then short-circuits with 304 Not Modified when the client's
 * If-None-Match/If-Modified-Since indicates it already has the current version.
 * Applied once here instead of per-controller so every GET endpoint (present and
 * future) gets this for free. Safe for existing clients: it only ever changes
 * behavior for requests that actually send a conditional header.
 */
export function conditionalGetMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "GET" && req.method !== "HEAD") {
        return next();
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: any) => {
        const etag = computeEtag(body);
        res.set("ETag", etag);
        if (!res.get("Cache-Control")) {
            res.set("Cache-Control", "private, must-revalidate");
        }

        const lastModified = extractLastModified(body);
        if (lastModified) {
            res.set("Last-Modified", lastModified.toUTCString());
        }

        const ifNoneMatch = req.headers["if-none-match"];
        if (typeof ifNoneMatch === "string") {
            if (matchesIfNoneMatch(ifNoneMatch, etag)) {
                return res.status(304).end();
            }
        } else {
            const ifModifiedSince = req.headers["if-modified-since"];
            if (typeof ifModifiedSince === "string" && lastModified) {
                const sinceDate = new Date(ifModifiedSince);
                if (!Number.isNaN(sinceDate.getTime()) && lastModified.getTime() <= sinceDate.getTime()) {
                    return res.status(304).end();
                }
            }
        }

        return originalJson(body);
    }) as typeof res.json;

    next();
}
