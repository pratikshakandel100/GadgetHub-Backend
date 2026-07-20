import { Request, Response } from "express";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { DashboardService } from "../services/dashboard.service";

const dashboardService = new DashboardService();

export class DashboardController {
    async getDashboard(req: Request, res: Response) {
        const summary = await dashboardService.getDashboardSummary();
        return ApiResponseHelper.success(res, summary, "Dashboard data fetched successfully", 200, undefined, {
            cacheControl: "private, no-store"
        });
    }
}
