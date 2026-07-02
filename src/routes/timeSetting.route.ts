import { Router } from "express";
import timeSettingController from "../controllers/timeSetting.controller";
import { authenticateToken } from "../middlewares/auth.middlewares";
import { roleMiddlewares } from "../middlewares/role.middlewares";

const timeSettingRouter = Router();

const adminOnly = [authenticateToken, roleMiddlewares(["admin", "president"])];

timeSettingRouter.post("/",            ...adminOnly, timeSettingController.create);
timeSettingRouter.get("/",             authenticateToken, timeSettingController.findAll);
timeSettingRouter.get("/code/:code",   authenticateToken, timeSettingController.findByCode);
timeSettingRouter.get("/:id",          authenticateToken, timeSettingController.findById);
timeSettingRouter.patch("/:id",        ...adminOnly, timeSettingController.updateById);
timeSettingRouter.delete("/:id",       ...adminOnly, timeSettingController.deleteById);

export default timeSettingRouter;
