import { Request, Response } from "express";
import response from "../helper/response";
import timeSettingService from "../services/timeSetting.service";

const timeSettingController = {
  create: async (req: Request, res: Response): Promise<any> => {
    try {
      const { code, checkin, checkinlimit, checkinlatelimit, checkout, checkoutlate } = req.body;
      if (!code || !checkin || !checkinlimit || !checkinlatelimit || !checkout || !checkoutlate) {
        return response({ res, code: 400, message: "All fields are required: code, checkin, checkinlimit, checkinlatelimit, checkout, checkoutlate" });
      }
      const data = await timeSettingService.create({ code, checkin, checkinlimit, checkinlatelimit, checkout, checkoutlate });
      return response({ res, code: 201, message: "Time setting created successfully", data });
    } catch (error: any) {
      const code = error.message?.includes("already exists") ? 409 : 500;
      return response({ res, code, message: error.message });
    }
  },

  findAll: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await timeSettingService.findAll();
      return response({ res, code: 200, message: "Time settings retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  findById: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await timeSettingService.findById(String(req.params.id));
      return response({ res, code: 200, message: "Time setting retrieved successfully", data });
    } catch (error: any) {
      const code = error.message?.includes("not found") ? 404 : 500;
      return response({ res, code, message: error.message });
    }
  },

  findByCode: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await timeSettingService.findByCode(String(req.params.code));
      return response({ res, code: 200, message: "Time setting retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  updateById: async (req: Request, res: Response): Promise<any> => {
    try {
      const { checkin, checkinlimit, checkinlatelimit, checkout, checkoutlate } = req.body;
      const data = await timeSettingService.updateById(String(req.params.id), { checkin, checkinlimit, checkinlatelimit, checkout, checkoutlate });
      return response({ res, code: 200, message: "Time setting updated successfully", data });
    } catch (error: any) {
      const code = error.message?.includes("not found") ? 404 : 500;
      return response({ res, code, message: error.message });
    }
  },

  deleteById: async (req: Request, res: Response): Promise<any> => {
    try {
      await timeSettingService.deleteById(String(req.params.id));
      return response({ res, code: 200, message: "Time setting deleted successfully" });
    } catch (error: any) {
      const code = error.message?.includes("not found") ? 404 : 500;
      return response({ res, code, message: error.message });
    }
  },
};

export default timeSettingController;
