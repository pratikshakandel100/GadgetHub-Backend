import { CartItemSchema, UpdateCartItemSchema } from "../../../src/types/cart.type";

describe("CartItemSchema", () => {
    it("accepts a valid productId and quantity", () => {
        expect(CartItemSchema.safeParse({ productId: "p1", quantity: 2 }).success).toBe(true);
    });

    it("defaults quantity to 1 when omitted", () => {
        const result = CartItemSchema.safeParse({ productId: "p1" });
        expect(result.success).toBe(true);
        expect(result.success && result.data.quantity).toBe(1);
    });

    it("rejects a missing productId", () => {
        expect(CartItemSchema.safeParse({ quantity: 1 }).success).toBe(false);
    });

    it("rejects a quantity below 1", () => {
        expect(CartItemSchema.safeParse({ productId: "p1", quantity: 0 }).success).toBe(false);
    });

    it("rejects a non-integer quantity", () => {
        expect(CartItemSchema.safeParse({ productId: "p1", quantity: 1.5 }).success).toBe(false);
    });
});

describe("UpdateCartItemSchema", () => {
    it("requires quantity to be at least 1", () => {
        expect(UpdateCartItemSchema.safeParse({ quantity: 1 }).success).toBe(true);
        expect(UpdateCartItemSchema.safeParse({ quantity: 0 }).success).toBe(false);
    });
});
