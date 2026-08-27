import { Request, Response } from "express";
import response from "../helper/response";
import spSettingService from "../services/spSetting.service";

const spSettingController = {
  create: async (req: Request, res: Response): Promise<any> => {
    try {
      const { name, point } = req.body;
      if (!name || point === undefined || point === null || isNaN(Number(point))) {
        return response({ res, code: 400, message: "Fields required: name, point" });
      }
      const data = await spSettingService.create({ name, point: Number(point) });
      return response({ res, code: 201, message: "SP setting created successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  findAll: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await spSettingService.findAll();
      return response({ res, code: 200, message: "SP settings retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  findById: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await spSettingService.findById(String(req.params.id));
      return response({ res, code: 200, message: "SP setting retrieved successfully", data });
    } catch (error: any) {
      const code = error.message?.includes("not found") ? 404 : 500;
      return response({ res, code, message: error.message });
    }
  },

  updateById: async (req: Request, res: Response): Promise<any> => {
    try {
      const { name, point } = req.body;
      const data = await spSettingService.updateById(String(req.params.id), {
        ...(name !== undefined && { name }),
        ...(point !== undefined && { point: Number(point) }),
      });
      return response({ res, code: 200, message: "SP setting updated successfully", data });
    } catch (error: any) {
      const code = error.message?.includes("not found") ? 404 : 500;
      return response({ res, code, message: error.message });
    }
  },

  deleteById: async (req: Request, res: Response): Promise<any> => {
    try {
      await spSettingService.deleteById(String(req.params.id));
      return response({ res, code: 200, message: "SP setting deleted successfully" });
    } catch (error: any) {
      const code = error.message?.includes("not found") ? 404 : 500;
      return response({ res, code, message: error.message });
    }
  },
};

export default spSettingController;
