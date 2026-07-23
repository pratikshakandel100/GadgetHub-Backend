import { ApiResponseHelper } from "../utils/apihelper.util";
import { z } from "zod";
import { Request, Response } from "express";
import { PaymentService } from "../services/payment.service";
import { InitiateEsewaPaymentDTO } from "../dtos/payment.dto";
import { FRONTEND_URL } from "../config/constant";

const paymentService = new PaymentService();

export class PaymentController {
    async initiateEsewaPayment(req: Request, res: Response) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                return ApiResponseHelper.error(res, "Unauthorized user not found", 401);
            }
            const parsed = InitiateEsewaPaymentDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, z.prettifyError(parsed.error), 400);
            }
            const paymentForm = await paymentService.initiateEsewaPayment(userId, parsed.data.orderId);
            return ApiResponseHelper.success(res, paymentForm, "eSewa payment initiated successfully");
        } catch (error: Error | any | unknown) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    // eSewa redirects the user's browser here (GET) after payment — this
    // endpoint is unauthenticated by necessity (it's a cross-origin browser
    // redirect, not an API call from our own frontend) and relies solely on
    // the signed callback payload plus a server-to-server status check.
    async handleEsewaSuccess(req: Request, res: Response) {
        try {
            const data = req.query.data as string | undefined;
            const orderIdHint = req.query.oid as string | undefined;
            const result = await paymentService.handleEsewaSuccess(data, orderIdHint);

            const status = result.success ? "success" : "failure";
            const orderQuery = result.orderId ? `&orderId=${result.orderId}` : "";
            return res.redirect(302, `${FRONTEND_URL}/user/payment/result?status=${status}${orderQuery}`);
        } catch (error: Error | any | unknown) {
            return res.redirect(302, `${FRONTEND_URL}/user/payment/result?status=failure`);
        }
    }

    async handleEsewaFailure(req: Request, res: Response) {
        try {
            const data = req.query.data as string | undefined;
            const orderIdHint = req.query.oid as string | undefined;
            const result = await paymentService.handleEsewaFailure(data, orderIdHint);

            const orderQuery = result.orderId ? `&orderId=${result.orderId}` : "";
            return res.redirect(302, `${FRONTEND_URL}/user/payment/result?status=failure${orderQuery}`);
        } catch (error: Error | any | unknown) {
            return res.redirect(302, `${FRONTEND_URL}/user/payment/result?status=failure`);
        }
    }
}
