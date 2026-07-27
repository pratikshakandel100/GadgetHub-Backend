import { computeStrongEtag, assertNotStale } from "../../../src/utils/precondition.util";
import type { Request } from "express";

const makeReq = (headers: Record<string, string>): Request => ({ headers } as unknown as Request);

describe("computeStrongEtag", () => {
    it("produces a quoted hash string", () => {
        const etag = computeStrongEtag({ a: 1 });
        expect(etag.startsWith('"')).toBe(true);
        expect(etag.endsWith('"')).toBe(true);
    });

    it("is deterministic for the same payload", () => {
        expect(computeStrongEtag({ a: 1, b: 2 })).toBe(computeStrongEtag({ a: 1, b: 2 }));
    });

    it("differs for different payloads", () => {
        expect(computeStrongEtag({ a: 1 })).not.toBe(computeStrongEtag({ a: 2 }));
    });
});

describe("assertNotStale", () => {
    it("does nothing when no If-Match or If-Unmodified-Since header is present", () => {
        expect(() => assertNotStale(makeReq({}), { updatedAt: new Date() })).not.toThrow();
    });

    it("passes when If-Match matches the current entity's etag", () => {
        const current = { updatedAt: new Date("2024-01-01") };
        const etag = computeStrongEtag(current);
        expect(() => assertNotStale(makeReq({ "if-match": etag }), current)).not.toThrow();
    });

    it("throws 412 when If-Match does not match", () => {
        const current = { updatedAt: new Date("2024-01-01") };
        expect(() => assertNotStale(makeReq({ "if-match": '"stale-etag"' }), current)).toThrow(
            "Precondition Failed: resource has changed since it was last fetched"
        );
    });

    it("accepts a wildcard If-Match", () => {
        expect(() => assertNotStale(makeReq({ "if-match": "*" }), { updatedAt: new Date() })).not.toThrow();
    });

    it("throws 412 when the entity was modified after If-Unmodified-Since", () => {
        const current = { updatedAt: new Date("2024-06-01") };
        expect(() =>
            assertNotStale(makeReq({ "if-unmodified-since": new Date("2024-01-01").toUTCString() }), current)
        ).toThrow("Precondition Failed: resource has changed since it was last fetched");
    });

    it("passes when the entity was not modified since If-Unmodified-Since", () => {
        const current = { updatedAt: new Date("2024-01-01") };
        expect(() =>
            assertNotStale(makeReq({ "if-unmodified-since": new Date("2024-06-01").toUTCString() }), current)
        ).not.toThrow();
    });
});
