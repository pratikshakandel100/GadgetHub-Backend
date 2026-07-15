import { Request } from "express";

export interface HateoasLink {
    href: string;
    method?: string;
}
export type HateoasLinks = Record<string, HateoasLink>;

const getOrigin = (req: Request): string => `${req.protocol}://${req.get("host")}`;

/** Absolute URL for a resource under the current router's mount path, e.g. `/api/v1/products/<id>`. */
export const buildResourceUrl = (req: Request, id?: string): string => {
    const base = `${getOrigin(req)}${req.baseUrl}`;
    return id ? `${base}/${id}` : base;
};

/** `_links` for a single-entity response: `self`, plus any caller-supplied related links. */
export const buildEntityLinks = (req: Request, id: string, extra?: HateoasLinks): HateoasLinks => ({
    self: { href: buildResourceUrl(req, id), method: "GET" },
    ...extra
});

/**
 * `_links` for a list response: self/first/prev/next/last, preserving the
 * current route's sub-path (e.g. `/products/published`) and existing query
 * params, only swapping `page`. Computed purely from the pagination numbers
 * already available — no extra DB calls needed.
 */
export const buildCollectionLinks = (
    req: Request,
    page: number,
    limit: number,
    total: number
): HateoasLinks => {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPath = req.originalUrl.split("?")[0];
    const origin = getOrigin(req);

    const withPage = (p: number): string => {
        const params = new URLSearchParams(req.query as Record<string, string>);
        params.set("page", String(p));
        params.set("limit", String(limit));
        return `${origin}${currentPath}?${params.toString()}`;
    };

    const links: HateoasLinks = {
        self: { href: withPage(page), method: "GET" },
        first: { href: withPage(1), method: "GET" },
        last: { href: withPage(totalPages), method: "GET" }
    };
    if (page > 1) links.prev = { href: withPage(page - 1), method: "GET" };
    if (page < totalPages) links.next = { href: withPage(page + 1), method: "GET" };
    return links;
};
