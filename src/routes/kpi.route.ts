import { Router } from "express";
import KPIItemController from "../controllers/kpi.item.controller";
import KPICountController from "../controllers/kpi.count.controller";
import { authenticateToken } from "../middlewares/auth.middlewares";
import { roleMiddlewares } from "../middlewares/role.middlewares";
import mikrotikService from "../services/mikrotik.service";
import response from "../helper/response";

const kpiItemRouter = Router();

// KPI Master
kpiItemRouter.post("/master", authenticateToken, roleMiddlewares(["admin"]), KPIItemController.addMaster);
kpiItemRouter.get("/master", authenticateToken, KPIItemController.getAllMasters);
kpiItemRouter.get("/master/:kementerian/details", authenticateToken, KPIItemController.getMasterWithDetails);
kpiItemRouter.get("/master/:id", authenticateToken, KPIItemController.getMasterById);
kpiItemRouter.put("/master/:id", authenticateToken, roleMiddlewares(["admin"]), KPIItemController.updateMaster);
kpiItemRouter.delete("/master/:id", authenticateToken, roleMiddlewares(["admin"]), KPIItemController.deleteMaster);

// KPI Detail
kpiItemRouter.post("/detail", authenticateToken, roleMiddlewares(["admin"]), KPIItemController.addDetail);
kpiItemRouter.get("/detail", authenticateToken, KPIItemController.getAllDetails);
kpiItemRouter.get("/detail/:masterId", authenticateToken, KPIItemController.getDetailsByMasterId);
kpiItemRouter.put("/detail/:id", authenticateToken, roleMiddlewares(["admin"]), KPIItemController.updateDetail);
kpiItemRouter.delete("/detail/:id", authenticateToken, roleMiddlewares(["admin"]), KPIItemController.deleteDetail);

// KPI Summary & Statistic
kpiItemRouter.get("/research/me", authenticateToken, KPICountController.getMyResearchSummary);
kpiItemRouter.get("/research", authenticateToken, KPICountController.getAllResearchSummary);
kpiItemRouter.get("/operational/me", authenticateToken, KPICountController.getMyOperationalSummary);
kpiItemRouter.get("/statistic", authenticateToken, KPICountController.getKpiStatistic);
kpiItemRouter.get("/me/operational", authenticateToken, KPICountController.getOperationalLeaderboard);
kpiItemRouter.get("/operational", authenticateToken, KPICountController.getAllOperationalBreakdown);
kpiItemRouter.get("/me", authenticateToken, KPICountController.getMyKPISummary);
kpiItemRouter.get("/summary/:userId", authenticateToken, KPICountController.getKPISummaryByUserId);
kpiItemRouter.get("/", authenticateToken, KPICountController.getAllKPISummary);



// test di kpi.route.ts atau buat route baru
kpiItemRouter.get("/mikrotik/test", authenticateToken, async (req, res) => {
  try {
    const arpTable = await mikrotikService.getArpTable();
    return response({ res, code: 200, message: "MikroTik connected", data: arpTable });
  } catch (error: any) {
    return response({ res, code: 500, message: error.message });
  }
});
export default kpiItemRouter;