import { WishlistItemSchema } from "../../../src/types/wishlist.type";

describe("WishlistItemSchema", () => {
    it("accepts a valid productId", () => {
        expect(WishlistItemSchema.safeParse({ productId: "p1" }).success).toBe(true);
    });

    it("rejects a missing productId", () => {
        expect(WishlistItemSchema.safeParse({}).success).toBe(false);
    });

    it("rejects an empty productId", () => {
        expect(WishlistItemSchema.safeParse({ productId: "" }).success).toBe(false);
    });
});
