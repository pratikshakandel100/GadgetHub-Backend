import { Router } from "express";
import { PaymentController } from "../controller/payment.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const paymentRouter = Router();
const paymentController = new PaymentController();

paymentRouter.post("/esewa/initiate", authorizedMiddleware, paymentController.initiateEsewaPayment);
paymentRouter.get("/esewa/success", paymentController.handleEsewaSuccess);
paymentRouter.get("/esewa/failure", paymentController.handleEsewaFailure);

export default paymentRouter;
