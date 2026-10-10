import { Router } from "express";
import BannerController from "../controllers/banner.controller";
import { authenticateToken } from "../middlewares/auth.middlewares";
import { roleMiddlewares } from "../middlewares/role.middlewares";
import uploadBanner from "../helper/bannerUpload";

const bannerRouter = Router();

const uploadMiddleware = (req: any, res: any, next: any) => {
  uploadBanner.single("image")(req, res, function (err: any) {
    if (err) return res.status(400).json({ code: 400, status: "failed", message: `Upload error: ${err.message}`, data: null });
    next();
  });
};

bannerRouter.get("/", authenticateToken, BannerController.getAllBanners);
bannerRouter.get("/me", authenticateToken, BannerController.getMyBanners);
bannerRouter.post("/", authenticateToken, roleMiddlewares(["admin"]), uploadMiddleware, BannerController.createBanner);
bannerRouter.put("/:id", authenticateToken, roleMiddlewares(["admin"]), uploadMiddleware, BannerController.updateBanner);
bannerRouter.delete("/:id", authenticateToken, roleMiddlewares(["admin"]), BannerController.deleteBanner);
bannerRouter.post("/:id/buy", authenticateToken, BannerController.buyBanner);
bannerRouter.post("/:id/equip", authenticateToken, BannerController.equipBanner);
bannerRouter.post("/unequip", authenticateToken, BannerController.unequipBanner);

export default bannerRouter;
