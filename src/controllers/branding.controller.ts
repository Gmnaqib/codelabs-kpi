import { Request, Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middlewares/auth.middlewares";
import response from "../helper/response";
import BrandingService from "../services/branding.service";
import { BrandingStatus } from "../models/branding/branding.interface";
import { resolveKpiDetailId } from "../helper/kpi.detail.validator";

const brandingController = {
  addBranding: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      const { name, description, link, research, level, id_kpi_detail } = req.body;
      const resolvedId = id_kpi_detail
        ? new Types.ObjectId(id_kpi_detail)
        : research ? await resolveKpiDetailId("branding", research) : undefined;
      const newBranding = await BrandingService.addBranding(userId, name, description, link, research, level, resolvedId?.toString());
      return response({ res, code: 201, message: "Branding success created", data: newBranding });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message, data: null });
    }
  },

  findAllBrandings: async (req: Request, res: Response): Promise<any> => {
    try {
      const filters = req.query;
      const Brandings = await BrandingService.findBrandingsByFilter(filters);
      return response({ res, code: 200, message: "Get Brandings by filter success", data: Brandings });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message, data: null });
    }
  },

  getMyBrandings: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      const { year, month } = req.query;
      if (!userId) return response({ res, code: 401, message: "Authentication required", data: null });
      const brandings = await BrandingService.getMyBrandings(userId, year ? Number(year) : undefined, month ? Number(month) : undefined);
      return response({ res, code: 200, message: "Get my brandings success", data: brandings });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message, data: null });
    }
  },

  updateMybrandings: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const { name, description, link, research, level, id_kpi_detail } = req.body;
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required", data: null });
      const updatedBranding = await BrandingService.updateMyBranding(id as string, userId, { name, description, link, research, level, id_kpi_detail });
      return response({ res, code: 200, message: "Update my branding success", data: updatedBranding });
    } catch (error: any) {
      if (error.message === "Branding not found") return response({ res, code: 404, message: error.message, data: null });
      if (error.message === "You can only update your own brandings") return response({ res, code: 403, message: error.message, data: null });
      return response({ res, code: 500, message: error.message, data: null });
    }
  },

  findBrandingById: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const Branding = await BrandingService.findBrandingById(id as string);
      return response({ res, code: 200, message: "Get Branding by id success", data: Branding });
    } catch (error: any) {
      return response({ res, code: error.message === "Branding not found" ? 404 : 500, message: error.message, data: null });
    }
  },

  getMyBrandingStats: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { year, month, week } = req.query;
      if (!userId) { response({ res, code: 401, message: "Authentication required", data: null }); return; }
      const stats = await BrandingService.getMyBrandingStats(userId, year ? Number(year) : undefined, month ? Number(month) : undefined, week ? Number(week) : undefined);
      response({ res, code: 200, message: "Get my branding stats success", data: stats });
    } catch (error: any) {
      response({ res, code: 500, message: error.message, data: null });
    }
  },

  // Admin update - bisa set nilai status 0-5
  updateBranding: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const { name, description, link, status, research, level, id_kpi_detail } = req.body;

      if (status !== undefined) {
        const statusNum = Number(status);
        if (isNaN(statusNum) || statusNum < 0 || statusNum > 5) {
          return response({ res, code: 400, message: "Invalid status. Must be a number between 0 and 5" });
        }
      }

      const Branding = await BrandingService.updateBranding(id as string, { name, description, link, status: status !== undefined ? Number(status) as BrandingStatus : undefined, research, level, id_kpi_detail });
      return response({ res, code: 200, message: "Update Branding success", data: Branding });
    } catch (error: any) {
      return response({ res, code: error.message === "Branding not found" ? 404 : 500, message: error.message, data: null });
    }
  },

  deleteBranding: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const deletedBranding = await BrandingService.deleteBranding(id as string);
      return response({ res, code: 200, message: "Delete Branding success", data: deletedBranding });
    } catch (error: any) {
      return response({ res, code: error.message === "Branding not found" ? 404 : 500, message: error.message, data: null });
    }
  },
};

export default brandingController;