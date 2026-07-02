import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middlewares";
import KPICountService from "../services/kpi.count.services";
import userRepository from "../repository/user.repository";
import response from "../helper/response";
import { Status } from "../models/user/user.interface";

const parseDateFilter = (query: any): { year: number; month?: number } | undefined => {
  const { year, month } = query;
  if (!year) return undefined;
  const yearNum = parseInt(year as string);
  if (isNaN(yearNum) || yearNum < 1900) return undefined;
  const dateFilter: { year: number; month?: number } = { year: yearNum };
  if (month) {
    const monthNum = parseInt(month as string);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      dateFilter.month = monthNum;
    }
  }
  return dateFilter;
};

const KPICountController = {

  getMyKPISummary: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });
      const dateFilter = parseDateFilter(req.query);

      const allSummaries = await KPICountService.getAllKPISummary(dateFilter);
      const rankIndex = allSummaries.findIndex((s) => s.userId.toString() === userId.toString());
      const summary = rankIndex >= 0 ? allSummaries[rankIndex] : await KPICountService.getMyKPISummary(userId, dateFilter);
      const rank = rankIndex >= 0 ? rankIndex + 1 : null;

      return response({
        res,
        code: 200,
        message: "KPI summary retrieved successfully",
        data: { ...summary, totalPoints: summary.grand_total, rank },
      });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // GET /kpi/
  getAllKPISummary: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const dateFilter = parseDateFilter(req.query);
      const summaries = await KPICountService.getAllKPISummary(dateFilter);
      const currentUserRole = req.user?.role;

      let data = summaries.map((s, index) => ({
        rank: index + 1,
        userId: s.userId,
        name: s.name,
        image: s.image ?? null,
        totalPoints: s.grand_total,
        grand_total: s.grand_total,
        categories: s.categories,
      }));

      if (currentUserRole !== "admin") {
        const allUsers = await userRepository.findAllUsers();
        const filteredIds = new Set(
          allUsers
            .filter((u: any) => u.role !== "admin" && u.role !== "lecturer")
            .map((u: any) => u._id.toString())
        );
        data = data.filter((d) => filteredIds.has(d.userId.toString()));
        data = data.map((d, index) => ({ ...d, rank: index + 1 }));
      }

      return response({ res, code: 200, message: "All KPI summaries retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getKPISummaryByUserId: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.params.userId as string;
      if (!userId) return response({ res, code: 400, message: "User ID is required" });
      const dateFilter = parseDateFilter(req.query);
      const summary = await KPICountService.getMyKPISummary(userId, dateFilter);
      return response({ res, code: 200, message: "KPI summary retrieved successfully", data: summary });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // GET /kpi/statistic?year=2026
  getKpiStatistic: async (req: Request, res: Response): Promise<any> => {
    try {
      const { year } = req.query;
      if (!year) return response({ res, code: 400, message: "Year is required" });
      const yearNum = parseInt(year as string);
      if (isNaN(yearNum) || yearNum < 1900) return response({ res, code: 400, message: "Invalid year" });
      const data = await KPICountService.getKpiStatistic(yearNum);
      return response({ res, code: 200, message: "KPI statistic retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // GET /kpi/me/operational?year=2026&month=6
  getOperationalLeaderboard: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const dateFilter = parseDateFilter(req.query);
      const data = await KPICountService.getOperationalLeaderboard(dateFilter);
      return response({ res, code: 200, message: "Operational leaderboard retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // GET /kpi/operational?year=2026&month=6
  getAllOperationalBreakdown: async (req: Request, res: Response): Promise<any> => {
    try {
      const dateFilter = parseDateFilter(req.query);
      const data = await KPICountService.getAllOperationalBreakdown(dateFilter);
      return response({ res, code: 200, message: "Operational breakdown retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // GET /kpi/operational/me?year=2026&month=6
  getMyOperationalSummary: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });
      const dateFilter = parseDateFilter(req.query);
      const data = await KPICountService.getMyOperationalSummary(userId, dateFilter);
      return response({ res, code: 200, message: "Operational summary retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // GET /kpi/research/me?year=2026&month=6
  getMyResearchSummary: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return response({ res, code: 401, message: "Authentication required" });
      const dateFilter = parseDateFilter(req.query);
      const data = await KPICountService.getMyResearchSummary(userId, dateFilter);
      return response({ res, code: 200, message: "Research summary retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  // GET /kpi/research?year=2026&month=6
  getAllResearchSummary: async (req: Request, res: Response): Promise<any> => {
    try {
      const dateFilter = parseDateFilter(req.query);
      const data = await KPICountService.getAllResearchSummary(dateFilter);
      return response({ res, code: 200, message: "Research summary retrieved successfully", data });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },
};

export default KPICountController;