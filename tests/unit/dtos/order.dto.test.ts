import {
    CreateOrderSchema,
    UpdateOrderStatusSchema,
    CancelOrderSchema,
    ShipOrderSchema,
    DeliverOrderSchema,
} from "../../../src/types/order.type";

describe("CreateOrderSchema", () => {
    it("accepts a valid Cash on Delivery order", () => {
        expect(CreateOrderSchema.safeParse({ shippingAddressId: "addr1", paymentMethod: "cod" }).success).toBe(true);
    });

    it("rejects any payment method other than cod (online payment was removed)", () => {
        expect(CreateOrderSchema.safeParse({ shippingAddressId: "addr1", paymentMethod: "online" }).success).toBe(false);
    });

    it("rejects a missing shippingAddressId", () => {
        expect(CreateOrderSchema.safeParse({ paymentMethod: "cod" }).success).toBe(false);
    });
});

describe("UpdateOrderStatusSchema", () => {
    it("accepts every valid order status", () => {
        for (const status of ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"]) {
            expect(UpdateOrderStatusSchema.safeParse({ status }).success).toBe(true);
        }
    });

    it("rejects an invalid status", () => {
        expect(UpdateOrderStatusSchema.safeParse({ status: "Refunded" }).success).toBe(false);
    });
});

describe("CancelOrderSchema", () => {
    it("accepts a valid reason without a note", () => {
        expect(CancelOrderSchema.safeParse({ reason: "Customer Request" }).success).toBe(true);
    });

    it("rejects a reason outside the allowed list", () => {
        expect(CancelOrderSchema.safeParse({ reason: "Changed my mind" }).success).toBe(false);
    });

    it("treats an empty-string note as omitted", () => {
        const result = CancelOrderSchema.safeParse({ reason: "Other", note: "" });
        expect(result.success).toBe(true);
        expect(result.success && result.data.note).toBeUndefined();
    });
});

describe("ShipOrderSchema", () => {
    it("requires both delivery person name and phone", () => {
        expect(ShipOrderSchema.safeParse({ deliveryPersonName: "Ram", deliveryPersonPhone: "9800000000" }).success).toBe(true);
        expect(ShipOrderSchema.safeParse({ deliveryPersonName: "Ram" }).success).toBe(false);
        expect(ShipOrderSchema.safeParse({ deliveryPersonPhone: "9800000000" }).success).toBe(false);
        expect(ShipOrderSchema.safeParse({}).success).toBe(false);
    });
});

describe("DeliverOrderSchema", () => {
    it("takes no input — delivering is a plain confirmation", () => {
        expect(DeliverOrderSchema.safeParse({}).success).toBe(true);
    });
});
