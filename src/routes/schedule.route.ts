import express from "express";
import scheduleController from "../controllers/schedule.controller";
import { authenticateToken } from "../middlewares/auth.middlewares";
import { roleMiddlewares } from "../middlewares/role.middlewares";
import scheduleMiddlewareValidator from "../middlewares/schedule.middleware.validator";

const router = express.Router();

router.get("/", authenticateToken, scheduleController.getAllSchedules);
router.get("/today", authenticateToken, scheduleController.getTodayPicketSchedule);
router.get("/swap", authenticateToken, scheduleController.getUpcomingPicketScheduleForSwap);
router.get("/:id", authenticateToken, scheduleController.getScheduleById);
router.delete("/:id", authenticateToken, roleMiddlewares(["admin", "minister of operation"]), scheduleController.deleteSchedule);
router.post("/", roleMiddlewares(["admin", "minister of operation"]), authenticateToken, scheduleMiddlewareValidator.createSchedule, scheduleController.createSchedule);
router.post("/batch", authenticateToken, roleMiddlewares(["admin", "minister of operation"]), scheduleController.createBatchSchedule);
router.post("/swap-users", authenticateToken, roleMiddlewares(["admin", "minister of operation"]), scheduleController.swapUsers);
router.put("/:id", roleMiddlewares(["admin", "minister of operation"]), authenticateToken, scheduleMiddlewareValidator.createSchedule, scheduleController.updateSchedule);
router.patch("/:id", roleMiddlewares(["admin", "minister of operation"]), authenticateToken, scheduleController.partialUpdateSchedule);

export default router;