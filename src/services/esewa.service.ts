import crypto from "crypto";
import {
    ESEWA_MERCHANT_CODE,
    ESEWA_SECRET_KEY,
    ESEWA_PAYMENT_URL,
    ESEWA_STATUS_CHECK_URL,
    BACKEND_URL
} from "../config/constant";

export interface IEsewaPaymentForm {
    paymentUrl: string;
    fields: Record<string, string>;
}

export interface IEsewaCallbackData {
    transaction_code: string;
    status: string;
    total_amount: string;
    transaction_uuid: string;
    product_code: string;
    signed_field_names: string;
    signature: string;
    [key: string]: string;
}

export interface IEsewaStatusResult {
    product_code: string;
    transaction_uuid: string;
    total_amount: string | number;
    status: "COMPLETE" | "PENDING" | "FULL_REFUND" | "PARTIAL_REFUND" | "AMBIGUOUS" | "NOT_FOUND" | "CANCELED" | string;
    ref_id: string;
}

// eSewa signs a comma-joined "key=value" string (in the exact order given by
// signed_field_names) with HMAC-SHA256 + base64 — both when we build the
// initiate payload and when we verify the fields it echoes back on redirect.
const buildSignature = (fields: Record<string, string | number>, signedFieldNames: string[]): string => {
    const message = signedFieldNames.map((field) => `${field}=${fields[field]}`).join(",");
    return crypto.createHmac("sha256", ESEWA_SECRET_KEY).update(message).digest("base64");
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

// Exported so callers can derive the exact same total_amount that
// buildPaymentForm will send eSewa, from the same subtotal/shippingFee
// inputs — used again at verification time so the two never disagree.
export const computeEsewaTotal = (amount: number, shippingFee: number): number => round2(round2(amount) + round2(shippingFee));

export class EsewaService {
    // eSewa's checkout page re-validates client-side that
    // total_amount === amount + tax_amount + product_service_charge +
    // product_delivery_charge before it will let the customer log in/pay —
    // if any of those don't line up to the cent (e.g. floating-point noise
    // like 33.33 * 3 = 99.99000000000001 leaking into a raw String()), that
    // check silently fails and the button never enables. Rounding every
    // amount to 2dp here — and deriving total_amount as the sum of the
    // already-rounded parts, rather than trusting a separately-computed
    // value — guarantees the sum eSewa checks always matches exactly.
    buildPaymentForm(params: { amount: number; shippingFee: number; transactionUuid: string; orderId: string }): IEsewaPaymentForm {
        const signedFieldNames = ["total_amount", "transaction_uuid", "product_code"];
        const amount = round2(params.amount);
        const deliveryCharge = round2(params.shippingFee);
        const totalAmount = computeEsewaTotal(params.amount, params.shippingFee);

        const fields: Record<string, string> = {
            amount: amount.toFixed(2),
            tax_amount: "0",
            total_amount: totalAmount.toFixed(2),
            transaction_uuid: params.transactionUuid,
            product_code: ESEWA_MERCHANT_CODE,
            product_service_charge: "0",
            product_delivery_charge: deliveryCharge.toFixed(2),
            success_url: `${BACKEND_URL}/api/v1/payments/esewa/success?oid=${params.orderId}`,
            failure_url: `${BACKEND_URL}/api/v1/payments/esewa/failure?oid=${params.orderId}`,
            signed_field_names: signedFieldNames.join(",")
        };
        fields.signature = buildSignature(fields, signedFieldNames);

        return { paymentUrl: ESEWA_PAYMENT_URL, fields };
    }

    // The `data` query param on the success redirect is base64-encoded JSON.
    // It's echoed back by the user's browser, so it must never be trusted on
    // its own — verify the embedded signature here, then confirm with the
    // authoritative server-to-server status check before trusting the status.
    decodeCallbackData(base64Data: string): IEsewaCallbackData | null {
        try {
            const decoded = JSON.parse(Buffer.from(base64Data, "base64").toString("utf-8")) as IEsewaCallbackData;
            if (!decoded?.signed_field_names || !decoded.signature) return null;

            const signedFieldNames = decoded.signed_field_names.split(",");
            const expectedSignature = buildSignature(decoded, signedFieldNames);
            if (expectedSignature !== decoded.signature) return null;

            return decoded;
        } catch {
            return null;
        }
    }

    async verifyTransaction(params: { totalAmount: number; transactionUuid: string }): Promise<IEsewaStatusResult | null> {
        const query = new URLSearchParams({
            product_code: ESEWA_MERCHANT_CODE,
            total_amount: round2(params.totalAmount).toFixed(2),
            transaction_uuid: params.transactionUuid
        });

        try {
            const response = await fetch(`${ESEWA_STATUS_CHECK_URL}?${query.toString()}`);
            if (!response.ok) return null;
            return (await response.json()) as IEsewaStatusResult;
        } catch {
            return null;
        }
    }
}
