import { Router } from "express";
import PointWalletController from "../controllers/pointWallet.controller";
import { authenticateToken } from "../middlewares/auth.middlewares";
import { roleMiddlewares } from "../middlewares/role.middlewares";

const pointWalletRouter = Router();

pointWalletRouter.get("/me", authenticateToken, PointWalletController.getMyWallet);
pointWalletRouter.get("/me/history", authenticateToken, PointWalletController.getMyHistory);
pointWalletRouter.get("/:userId", authenticateToken, roleMiddlewares(["admin"]), PointWalletController.getWalletByUserId);
pointWalletRouter.post("/redeem", authenticateToken, roleMiddlewares(["admin"]), PointWalletController.redeem);

export default pointWalletRouter;
