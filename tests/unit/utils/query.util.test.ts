import { parsePagination } from "../../../src/utils/query.util";

describe("parsePagination", () => {
    it("applies default page=1 and the given default limit when no query params are present", () => {
        expect(parsePagination({}, 10)).toEqual({ page: 1, limit: 10, skip: 0 });
    });

    it("computes skip correctly from valid page/limit query params", () => {
        expect(parsePagination({ page: "3", limit: "20" } as any)).toEqual({ page: 3, limit: 20, skip: 40 });
    });
});
