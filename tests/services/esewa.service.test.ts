import { EsewaService, computeEsewaTotal } from "../../src/services/esewa.service";

describe("computeEsewaTotal", () => {
    it("rounds amount and shipping fee to 2 decimal places before summing them", () => {
        expect(computeEsewaTotal(999.995, 50)).toBe(1050);
        expect(computeEsewaTotal(100, 0)).toBe(100);
    });
});

describe("EsewaService.buildPaymentForm", () => {
    it("builds form fields whose total_amount equals amount + delivery charge, and includes a signature", () => {
        const service = new EsewaService();
        const form = service.buildPaymentForm({
            amount: 1000,
            shippingFee: 100,
            transactionUuid: "txn-123",
            orderId: "order-1",
        });

        expect(form.fields.amount).toBe("1000.00");
        expect(form.fields.product_delivery_charge).toBe("100.00");
        expect(form.fields.total_amount).toBe("1100.00");
        expect(form.fields.transaction_uuid).toBe("txn-123");
        expect(typeof form.fields.signature).toBe("string");
        expect(form.fields.signature.length).toBeGreaterThan(0);
    });
});

describe("EsewaService.decodeCallbackData", () => {
    it("decodes a validly-signed base64 callback payload", () => {
        const service = new EsewaService();
        // buildPaymentForm's output fields are already signed over the same
        // (total_amount, transaction_uuid, product_code) triple that the
        // callback payload carries, so reusing them yields a genuinely valid signature.
        const form = service.buildPaymentForm({ amount: 500, shippingFee: 0, transactionUuid: "txn-456", orderId: "order-2" });

        const payload = {
            transaction_code: "TC1",
            status: "COMPLETE",
            ...form.fields,
        };
        const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");
        const decoded = service.decodeCallbackData(base64);

        expect(decoded).not.toBeNull();
        expect(decoded?.transaction_uuid).toBe("txn-456");
    });

    it("rejects a payload whose signature has been tampered with", () => {
        const service = new EsewaService();
        const payload = {
            transaction_code: "TC1",
            status: "COMPLETE",
            total_amount: "500.00",
            transaction_uuid: "txn-456",
            product_code: "EPAYTEST",
            signed_field_names: "total_amount,transaction_uuid,product_code",
            signature: "not-a-real-signature",
        };
        const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");

        expect(service.decodeCallbackData(base64)).toBeNull();
    });

    it("returns null for a payload that isn't valid base64-encoded JSON", () => {
        const service = new EsewaService();
        expect(service.decodeCallbackData("not-valid-base64-json")).toBeNull();
    });
});
