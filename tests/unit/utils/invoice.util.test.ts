import { formatCurrency } from "../../../src/utils/invoice.util";

describe("formatCurrency", () => {
    it("formats an amount with the currency code and thousands separators, including zero", () => {
        expect(formatCurrency(125000, "NPR")).toBe("NPR 1,25,000");
        expect(formatCurrency(0, "NPR")).toBe("NPR 0");
    });
});
