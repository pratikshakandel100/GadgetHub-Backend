import { Router } from "express";
import { InventoryController } from "../controller/inventory.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const inventoryRouter = Router();
const inventoryController = new InventoryController();

inventoryRouter.get("/", authorizedMiddleware, adminMiddleware, inventoryController.getInventoryList);
inventoryRouter.get("/summary", authorizedMiddleware, adminMiddleware, inventoryController.getSummary);
inventoryRouter.get("/:id/history", authorizedMiddleware, adminMiddleware, inventoryController.getStockHistory);
inventoryRouter.patch("/:id/restock", authorizedMiddleware, adminMiddleware, inventoryController.restockProduct);
inventoryRouter.patch("/:id/adjust", authorizedMiddleware, adminMiddleware, inventoryController.adjustStock);

export default inventoryRouter;
