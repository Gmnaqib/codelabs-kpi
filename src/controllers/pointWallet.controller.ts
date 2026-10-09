import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middlewares";
import pointWalletService from "../services/pointWallet.service";
import response from "../helper/response";
import { Types } from "mongoose";

const PointWalletController = {
  getMyWallet: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });

      const wallet = await pointWalletService.getWalletBalance(userId);
      return response({ res, code: 200, message: "Point wallet retrieved successfully", data: wallet });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getWalletByUserId: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.params.userId as string;
      if (!Types.ObjectId.isValid(userId)) return response({ res, code: 400, message: "Invalid userId format" });

      const wallet = await pointWalletService.getWalletBalance(userId);
      return response({ res, code: 200, message: "Point wallet retrieved successfully", data: wallet });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getMyHistory: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });

      const history = await pointWalletService.getHistory(userId);
      return response({ res, code: 200, message: "Point redemption history retrieved successfully", data: history });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  redeem: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const adminId = req.user?.id;
      if (!adminId) return response({ res, code: 401, message: "Authentication required" });

      const { userId, amount, reason } = req.body;
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return response({ res, code: 400, message: "A valid userId is required" });
      }
      const amountNum = Number(amount);
      if (!amount || isNaN(amountNum) || amountNum <= 0) {
        return response({ res, code: 400, message: "amount must be a positive number" });
      }
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return response({ res, code: 400, message: "reason is required" });
      }

      const result = await pointWalletService.redeemPoints(userId, amountNum, reason, adminId);
      return response({ res, code: 201, message: "Points redeemed successfully", data: result });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },
};

export default PointWalletController;
