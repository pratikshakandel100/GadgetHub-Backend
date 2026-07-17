import { Router } from "express";
import { AiController } from "../controller/ai.controller";

const aiRouter = Router();
const aiController = new AiController();

aiRouter.post("/chat", aiController.chat);
aiRouter.post("/compare", aiController.compare);

export default aiRouter;
