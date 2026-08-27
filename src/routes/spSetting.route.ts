import { Router } from "express";
import spSettingController from "../controllers/spSetting.controller";
import { authenticateToken } from "../middlewares/auth.middlewares";
import { roleMiddlewares } from "../middlewares/role.middlewares";

const spSettingRouter = Router();

const adminOnly = [authenticateToken, roleMiddlewares(["admin"])];

spSettingRouter.post("/",      ...adminOnly, spSettingController.create);
spSettingRouter.get("/",       authenticateToken, spSettingController.findAll);
spSettingRouter.get("/:id",    authenticateToken, spSettingController.findById);
spSettingRouter.patch("/:id",  ...adminOnly, spSettingController.updateById);
spSettingRouter.delete("/:id", ...adminOnly, spSettingController.deleteById);

export default spSettingRouter;
