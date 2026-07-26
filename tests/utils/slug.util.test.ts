import { slugify } from "../../src/utils/slug.util";

describe("slugify", () => {
    it("lowercases the input and replaces spaces with hyphens", () => {
        expect(slugify("Apple iPhone 16 Pro")).toBe("apple-iphone-16-pro");
    });

    it("collapses runs of punctuation/whitespace into a single hyphen and trims leading/trailing hyphens", () => {
        expect(slugify("  --Samsung Galaxy S24 Ultra!! (Titanium) --  ")).toBe("samsung-galaxy-s24-ultra-titanium");
    });
});
