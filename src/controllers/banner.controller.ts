import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middlewares";
import bannerService from "../services/banner.service";
import { BannerType } from "../models/banner/banner.interface";
import response from "../helper/response";

const BannerController = {
  createBanner: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { name, type, point_cost } = req.body;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return response({ res, code: 400, message: "image file is required" });

      if (!Object.values(BannerType).includes(type)) {
        return response({ res, code: 400, message: `type must be one of: ${Object.values(BannerType).join(", ")}` });
      }

      const pointCostNum = Number(point_cost);
      if (!point_cost || isNaN(pointCostNum) || pointCostNum < 0) {
        return response({ res, code: 400, message: "point_cost must be a non-negative number" });
      }

      const image = `/uploads/banners/${file.filename}`;
      const banner = await bannerService.createBanner({ name, type, point_cost: pointCostNum, image });
      return response({ res, code: 201, message: "Banner created successfully", data: banner });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  getAllBanners: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const banners = await bannerService.getAllBanners();
      return response({ res, code: 200, message: "Banners retrieved successfully", data: banners });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  updateBanner: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const id = req.params.id as string;
      const { name, type, point_cost } = req.body;
      const file = (req as any).file as Express.Multer.File | undefined;

      const data: Partial<{ name: string; type: BannerType; point_cost: number; image: string }> = {};
      if (name !== undefined) data.name = name;
      if (type !== undefined) {
        if (!Object.values(BannerType).includes(type)) {
          return response({ res, code: 400, message: `type must be one of: ${Object.values(BannerType).join(", ")}` });
        }
        data.type = type;
      }
      if (point_cost !== undefined) {
        const pointCostNum = Number(point_cost);
        if (isNaN(pointCostNum) || pointCostNum < 0) {
          return response({ res, code: 400, message: "point_cost must be a non-negative number" });
        }
        data.point_cost = pointCostNum;
      }
      if (file) data.image = `/uploads/banners/${file.filename}`;

      const banner = await bannerService.updateBanner(id, data);
      return response({ res, code: 200, message: "Banner updated successfully", data: banner });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  deleteBanner: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const id = req.params.id as string;
      const banner = await bannerService.deleteBanner(id);
      return response({ res, code: 200, message: "Banner deleted successfully", data: banner });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  getMyBanners: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });

      const data = await bannerService.getMyBanners(userId);
      return response({ res, code: 200, message: "My banners retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  buyBanner: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });

      const bannerId = req.params.id as string;
      const result = await bannerService.buyBanner(userId, bannerId);
      return response({ res, code: 200, message: "Banner purchased successfully", data: result });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  equipBanner: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });

      const bannerId = req.params.id as string;
      const result = await bannerService.equipBanner(userId, bannerId);
      return response({ res, code: 200, message: "Banner equipped successfully", data: result });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  unequipBanner: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });

      const { type } = req.body;
      if (!Object.values(BannerType).includes(type)) {
        return response({ res, code: 400, message: `type must be one of: ${Object.values(BannerType).join(", ")}` });
      }

      const result = await bannerService.unequipBanner(userId, type);
      return response({ res, code: 200, message: "Unequipped successfully", data: result });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },
};

export default BannerController;
