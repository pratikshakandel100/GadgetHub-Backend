import { buildResourceUrl, buildEntityLinks, buildCollectionLinks } from "../../../src/utils/hateoas.util";
import type { Request } from "express";

const makeReq = (overrides: Partial<Request> = {}): Request => ({
    protocol: "http",
    get: (() => "localhost:8080") as any,
    baseUrl: "/api/v1/products",
    originalUrl: "/api/v1/products?page=2",
    query: {},
    ...overrides,
} as Request);

describe("buildResourceUrl", () => {
    it("builds the collection URL when no id is given", () => {
        expect(buildResourceUrl(makeReq())).toBe("http://localhost:8080/api/v1/products");
    });

    it("appends the id when given", () => {
        expect(buildResourceUrl(makeReq(), "p1")).toBe("http://localhost:8080/api/v1/products/p1");
    });
});

describe("buildEntityLinks", () => {
    it("always includes a self link and merges in extra links", () => {
        const links = buildEntityLinks(makeReq(), "p1", { delete: { href: "x", method: "DELETE" } });
        expect(links.self).toEqual({ href: "http://localhost:8080/api/v1/products/p1", method: "GET" });
        expect(links.delete).toEqual({ href: "x", method: "DELETE" });
    });
});

describe("buildCollectionLinks", () => {
    it("omits prev on the first page and next on the last page", () => {
        const links = buildCollectionLinks(makeReq(), 1, 10, 10);
        expect(links.prev).toBeUndefined();
        expect(links.next).toBeUndefined();
        expect(links.self).toBeDefined();
        expect(links.first).toBeDefined();
        expect(links.last).toBeDefined();
    });

    it("includes both prev and next on a middle page", () => {
        const links = buildCollectionLinks(makeReq(), 2, 10, 30);
        expect(links.prev?.href).toContain("page=1");
        expect(links.next?.href).toContain("page=3");
    });

    it("treats zero total as a single page", () => {
        const links = buildCollectionLinks(makeReq(), 1, 10, 0);
        expect(links.last.href).toContain("page=1");
    });
});
