import { Request } from "express";

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

/** Parses `?page=&limit=` with the same defaults every list endpoint used inline before (page=1, limit=defaultLimit). */
export const parsePagination = (query: Request["query"], defaultLimit: number = 10): PaginationParams => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || defaultLimit);
    return { page, limit, skip: (page - 1) * limit };
};

export type SortOrder = 1 | -1;

/**
 * Parses `?sortBy=&order=` against a resource-specific whitelist. Falls back to
 * `defaultField`/`defaultOrder` (matching each resource's previously-hardcoded
 * sort) whenever `sortBy` is absent or not in the whitelist, so existing callers
 * that never send these params keep getting identical ordering.
 */
export const parseSort = (
    query: Request["query"],
    allowedFields: string[],
    defaultField: string,
    defaultOrder: SortOrder = -1
): Record<string, SortOrder> => {
    const sortByRaw = typeof query.sortBy === "string" ? query.sortBy : "";
    const field = allowedFields.includes(sortByRaw) ? sortByRaw : defaultField;

    const orderRaw = typeof query.order === "string" ? query.order.toLowerCase() : "";
    const order: SortOrder = orderRaw === "asc" ? 1 : orderRaw === "desc" ? -1 : defaultOrder;

    return { [field]: order };
};

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/** Replaces the `{page, limit, total, totalPages: Math.ceil(total/limit)}` literal duplicated in every repository. */
export const buildPaginationMeta = (total: number, page: number, limit: number): PaginationMeta => ({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
});
