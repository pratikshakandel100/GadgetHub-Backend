import crypto from "crypto";
import mongoose from "mongoose";
import { OrderService } from "./order.service";
import { OrderMongoRepository } from "../repositories/order.repository";
import { EsewaService, IEsewaPaymentForm, computeEsewaTotal } from "./esewa.service";
import { HttpException } from "../exceptions/http-exception";

const orderRepository = new OrderMongoRepository();
const orderService = new OrderService();
const esewaService = new EsewaService();

export interface IEsewaCallbackResult {
    success: boolean;
    orderId: string | null;
    message: string;
}

export class PaymentService {
    async initiateEsewaPayment(userId: string, orderId: string): Promise<IEsewaPaymentForm> {
        const order = await orderRepository.getById(orderId);
        if (!order) {
            throw new HttpException(404, "Order not found");
        }
        const orderUserId = (order.user as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        if (orderUserId !== userId) {
            throw new HttpException(404, "Order not found");
        }
        if (order.paymentMethod !== "online") {
            throw new HttpException(400, "This order is not payable online");
        }
        if (order.paymentStatus === "Paid") {
            throw new HttpException(400, "This order has already been paid for");
        }

        // A fresh transaction_uuid per attempt: eSewa treats it as a unique
        // transaction, and retrying a failed payment must not reuse a uuid
        // that eSewa may have already recorded a CANCELED/failed status for.
        const transactionUuid = crypto.randomUUID();
        await orderRepository.updatePayment(order._id.toString(), {
            referenceId: transactionUuid,
            paymentStatus: "Pending"
        });

        return esewaService.buildPaymentForm({
            amount: order.subtotal,
            shippingFee: order.shippingFee,
            transactionUuid,
            orderId: order._id.toString()
        });
    }

    async handleEsewaSuccess(dataParam: string | undefined, orderIdHint: string | undefined): Promise<IEsewaCallbackResult> {
        const decoded = dataParam ? esewaService.decodeCallbackData(dataParam) : null;

        const order = decoded
            ? await orderService.getOrderByReferenceId(decoded.transaction_uuid)
            : orderIdHint
                ? await orderRepository.getById(orderIdHint)
                : null;

        if (!order) {
            return { success: false, orderId: null, message: "Order not found for this transaction" };
        }
        if (order.paymentStatus === "Paid") {
            return { success: true, orderId: order._id.toString(), message: "Payment already confirmed" };
        }
        if (!order.referenceId) {
            return { success: false, orderId: order._id.toString(), message: "No active payment attempt for this order" };
        }

        // The redirect payload is browser-supplied and never trusted alone —
        // confirm the outcome with eSewa's status-check API server-to-server.
        // Re-derive the same total that was actually sent to eSewa at
        // initiation (from subtotal + shippingFee) rather than trusting
        // order.total verbatim — see buildPaymentForm's comment for why.
        const expectedTotal = computeEsewaTotal(order.subtotal, order.shippingFee);
        const statusResult = await esewaService.verifyTransaction({
            totalAmount: expectedTotal,
            transactionUuid: order.referenceId
        });

        const amountMatches = statusResult ? Math.abs(Number(statusResult.total_amount) - expectedTotal) < 0.01 : false;
        if (statusResult?.status === "COMPLETE" && amountMatches) {
            await orderService.markOrderPaid(
                order._id.toString(),
                statusResult.ref_id || decoded?.transaction_code || order.referenceId
            );
            return { success: true, orderId: order._id.toString(), message: "Payment confirmed" };
        }

        await orderService.markOrderPaymentFailed(order._id.toString());
        return { success: false, orderId: order._id.toString(), message: "Payment could not be verified" };
    }

    async handleEsewaFailure(dataParam: string | undefined, orderIdHint: string | undefined): Promise<IEsewaCallbackResult> {
        const decoded = dataParam ? esewaService.decodeCallbackData(dataParam) : null;

        const order = decoded
            ? await orderService.getOrderByReferenceId(decoded.transaction_uuid)
            : orderIdHint
                ? await orderRepository.getById(orderIdHint)
                : null;

        if (!order) {
            return { success: false, orderId: null, message: "Order not found for this transaction" };
        }

        await orderService.markOrderPaymentFailed(order._id.toString());
        return { success: false, orderId: order._id.toString(), message: "Payment was not completed" };
    }
}
