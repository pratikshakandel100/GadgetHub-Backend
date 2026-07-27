// The real `meilisearch` package ships ESM-only, which ts-jest can't parse
// from node_modules — mock it unconditionally so it's never actually loaded,
// even in the "not configured" branch where the import statement still runs
// (only the constructor call is skipped by the enabled ternary at runtime).
jest.mock("meilisearch", () => ({ Meilisearch: jest.fn() }));

describe("ProductSearchService when Meilisearch is not configured", () => {
    beforeEach(() => {
        jest.resetModules();
        jest.doMock("../../../src/config/constant", () => ({ MEILISEARCH_HOST: "", MEILISEARCH_API_KEY: "" }));
    });

    it("reports itself as disabled", async () => {
        const { ProductSearchService } = await import("../../../src/services/product-search.service");
        expect(new ProductSearchService().enabled).toBe(false);
    });

    it("safely no-ops upsert/remove/configure instead of throwing", async () => {
        const { ProductSearchService } = await import("../../../src/services/product-search.service");
        const service = new ProductSearchService();
        await expect(service.upsert({} as any)).resolves.toBeUndefined();
        await expect(service.remove("p1")).resolves.toBeUndefined();
        await expect(service.configure()).resolves.toBeUndefined();
    });

    it("returns null from search and adminSearch, signaling the caller to fall back to MongoDB", async () => {
        const { ProductSearchService } = await import("../../../src/services/product-search.service");
        const service = new ProductSearchService();
        await expect(service.search("phone", 20)).resolves.toBeNull();
        await expect(service.adminSearch({ query: "phone", page: 1, limit: 20, sort: {} })).resolves.toBeNull();
    });
});

describe("ProductSearchService when Meilisearch is configured", () => {
    const mockSearch = jest.fn();
    const mockUpdateSettings = jest.fn();
    const mockIndex = jest.fn(() => ({ search: mockSearch, updateSettings: mockUpdateSettings }));

    beforeEach(() => {
        jest.resetModules();
        mockSearch.mockReset();
        jest.doMock("../../../src/config/constant", () => ({ MEILISEARCH_HOST: "http://localhost:7700", MEILISEARCH_API_KEY: "key" }));
        jest.doMock("meilisearch", () => ({
            Meilisearch: jest.fn().mockImplementation(() => ({ index: mockIndex })),
        }));
    });

    it("reports itself as enabled", async () => {
        const { ProductSearchService } = await import("../../../src/services/product-search.service");
        expect(new ProductSearchService().enabled).toBe(true);
    });

    it("filters storefront search to Published products only", async () => {
        mockSearch.mockResolvedValue({ hits: [{ id: "p1" }] });
        const { ProductSearchService } = await import("../../../src/services/product-search.service");

        const hits = await new ProductSearchService().search("phone", 20);

        expect(mockSearch).toHaveBeenCalledWith("phone", expect.objectContaining({ filter: ["status = Published"] }));
        expect(hits).toEqual([{ id: "p1" }]);
    });

    it("does not filter by status in adminSearch when none is requested", async () => {
        mockSearch.mockResolvedValue({ hits: [], totalHits: 0, page: 1, hitsPerPage: 20, totalPages: 0 });
        const { ProductSearchService } = await import("../../../src/services/product-search.service");

        await new ProductSearchService().adminSearch({ query: "phone", page: 1, limit: 20, sort: {} });

        const callArgs = mockSearch.mock.calls[0][1];
        expect(callArgs.filter).toBeUndefined();
    });
});
