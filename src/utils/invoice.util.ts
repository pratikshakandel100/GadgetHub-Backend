import PDFDocument from "pdfkit";
import { IOrder } from "../models/order.model";

const COMPANY = {
    name: "GadgetHub",
    address: "Kathmandu, Nepal",
    email: "support@gadgethub.com",
    website: "www.gadgethub.com",
};

const CYAN = "#0891b2";
const SLATE = "#334155";
const MUTED = "#64748b";

const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

export const formatCurrency = (amount: number, currency: string) => `${currency} ${amount.toLocaleString("en-IN")}`;

const invoiceNumberFor = (orderNumber: string) => `INV-${orderNumber.replace(/^ORD-/, "")}`;

export function generateInvoicePdf(order: IOrder): PDFKit.PDFDocument {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const user = order.user as unknown as { fullname?: string; email?: string };
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    const rule = () => {
        doc.moveDown(0.5);
        doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke();
        doc.moveDown(0.5);
    };

    const row = (label: string, value: string, opts?: { bold?: boolean }) => {
        doc.fontSize(10).fillColor(MUTED).text(label, left, doc.y, { continued: true, width: pageWidth / 2 });
        doc
            .fillColor(opts?.bold ? SLATE : SLATE)
            .font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
            .text(value, { align: "right" });
        doc.font("Helvetica");
    };

    // Header
    doc.fontSize(22).fillColor(CYAN).font("Helvetica-Bold").text(COMPANY.name, { align: "center" });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(COMPANY.address, { align: "center" });
    doc.text(`${COMPANY.email}  |  ${COMPANY.website}`, { align: "center" });
    rule();

    // Invoice / order meta
    row("Invoice Number", invoiceNumberFor(order.orderNumber));
    row("Order Number", order.orderNumber);
    row("Invoice Date", formatDate(new Date()));
    rule();

    // Customer
    row("Customer", user?.fullname || "-");
    row("Email", user?.email || "-");
    row("Phone", order.shippingAddress.phoneNumber);
    doc.fontSize(10).fillColor(MUTED).text("Shipping Address", left, doc.y);
    doc.fontSize(10).fillColor(SLATE).text(
        [
            order.shippingAddress.street,
            `Ward ${order.shippingAddress.wardNumber}, ${order.shippingAddress.municipality}`,
            `${order.shippingAddress.district}, ${order.shippingAddress.province}`,
        ].join(", "),
        { align: "right" }
    );
    rule();

    // Items table
    const colProduct = left;
    const colQty = left + pageWidth - 180;
    const colPrice = left + pageWidth - 100;
    const tableTop = doc.y;

    doc.fontSize(10).font("Helvetica-Bold").fillColor(MUTED);
    doc.text("Product", colProduct, tableTop, { width: colQty - colProduct - 10 });
    doc.text("Qty", colQty, tableTop, { width: 60, align: "right" });
    doc.text("Price", colPrice, tableTop, { width: left + pageWidth - colPrice, align: "right" });
    doc.font("Helvetica");
    doc.moveDown(0.5);
    doc.strokeColor("#e2e8f0").moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke();
    doc.moveDown(0.3);

    for (const item of order.items) {
        const y = doc.y;
        doc.fontSize(10).fillColor(SLATE).text(item.name, colProduct, y, { width: colQty - colProduct - 10 });
        doc.text(String(item.quantity), colQty, y, { width: 60, align: "right" });
        doc.text(formatCurrency(item.price * item.quantity, order.currency), colPrice, y, {
            width: left + pageWidth - colPrice,
            align: "right",
        });
        doc.moveDown(0.4);
    }
    rule();

    // Totals
    row("Subtotal", formatCurrency(order.subtotal, order.currency));
    row("Shipping", order.shippingFee === 0 ? "Free" : formatCurrency(order.shippingFee, order.currency));
    doc.moveDown(0.2);
    row("Grand Total", formatCurrency(order.total, order.currency), { bold: true });
    rule();

    // Payment
    row("Payment Method", "Cash on Delivery");
    row("Payment Status", order.paymentStatus);
    if (order.transactionId) {
        row("Transaction ID", order.transactionId);
    }
    rule();

    // Footer
    doc.moveDown(1);
    doc.fontSize(11).fillColor(SLATE).font("Helvetica-Bold").text("Thank you for shopping with GadgetHub.", { align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).moveDown(0.5);
    doc.text(`Generated automatically by GadgetHub on ${formatDate(new Date())}`, { align: "center" });

    return doc;
}
