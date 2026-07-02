import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middlewares";
import response from "../helper/response";
import KPIItemService from "../services/kpi.services";

const KPIItemController = {
  // ─── KPI Master ─────────────────────────────────────────────────────────────

  addMaster: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { kementerian, point } = req.body;
      const data = await KPIItemService.addMaster({ kementerian, point });
      return response({ res, code: 201, message: "KPI master created successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getAllMasters: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await KPIItemService.findAllMasters();
      return response({ res, code: 200, message: "KPI masters retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getMasterById: async (req: Request, res: Response): Promise<any> => {
    try {
      const id = req.params.id as string;
      const data = await KPIItemService.findMasterById(id);
      if (!data) return response({ res, code: 404, message: "KPI master not found" });
      return response({ res, code: 200, message: "KPI master retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // GET /kpi/master/:kementerian/details
  getMasterWithDetails: async (req: Request, res: Response): Promise<any> => {
    try {
      const kementerian = req.params.kementerian as string;
      const master = await KPIItemService.findMasterByKementerian(kementerian);
      if (!master) return response({ res, code: 404, message: "KPI master not found" });
      const details = await KPIItemService.findDetailsByMasterId((master as any)._id.toString());
      return response({
        res,
        code: 200,
        message: "KPI master with details retrieved successfully",
        data: {
          _id: (master as any)._id,
          kementerian: master.kementerian,
          point: master.point,
          details,
        },
      });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  updateMaster: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const id = req.params.id as string;
      const data = await KPIItemService.updateMaster(id, req.body);
      if (!data) return response({ res, code: 404, message: "KPI master not found" });
      return response({ res, code: 200, message: "KPI master updated successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  deleteMaster: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const id = req.params.id as string;
      const data = await KPIItemService.deleteMaster(id);
      if (!data) return response({ res, code: 404, message: "KPI master not found" });
      return response({ res, code: 200, message: "KPI master deleted successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // ─── KPI Detail ─────────────────────────────────────────────────────────────

  addDetail: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const data = await KPIItemService.addDetail(req.body);
      return response({ res, code: 201, message: "KPI detail created successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getAllDetails: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await KPIItemService.findAllDetails();
      return response({ res, code: 200, message: "KPI details retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getDetailsByMasterId: async (req: Request, res: Response): Promise<any> => {
    try {
      const masterId = req.params.masterId as string;
      const data = await KPIItemService.findDetailsByMasterId(masterId);
      return response({ res, code: 200, message: "KPI details retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  updateDetail: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const id = req.params.id as string;
      const data = await KPIItemService.updateDetail(id, req.body);
      if (!data) return response({ res, code: 404, message: "KPI detail not found" });
      return response({ res, code: 200, message: "KPI detail updated successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  deleteDetail: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const id = req.params.id as string;
      const data = await KPIItemService.deleteDetail(id);
      if (!data) return response({ res, code: 404, message: "KPI detail not found" });
      return response({ res, code: 200, message: "KPI detail deleted successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },
};

export default KPIItemController;