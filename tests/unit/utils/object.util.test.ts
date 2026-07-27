import { stripUndefined } from "../../../src/utils/object.util";

describe("stripUndefined", () => {
    it("removes only the keys whose value is undefined", () => {
        expect(stripUndefined({ minPrice: undefined, maxPrice: 500 })).toEqual({ maxPrice: 500 });
    });

    it("preserves falsy-but-meaningful values (null, 0, false) and handles an empty input object", () => {
        expect(stripUndefined({ a: null, b: 0, c: false, d: undefined })).toEqual({ a: null, b: 0, c: false });
        expect(stripUndefined({})).toEqual({});
    });
});
