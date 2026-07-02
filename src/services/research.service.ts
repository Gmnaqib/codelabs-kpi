import IResearch, { progressStatus, ResearchStatus } from "../models/research/research.interface";
import researchRepository from "../repository/research.repository";
import { validateKpiDetailKementerian } from "../helper/kpi.detail.validator";

const researchService = {
  createResearch: async (researchData: IResearch): Promise<IResearch> => {
    if (!researchData.userId || !researchData.week || !researchData.title) {
      throw new Error("Missing required fields: userId, week, and title are required");
    }

    if (researchData.week <= 0) {
      throw new Error("Week number must be a positive integer");
    }

    try {
      new URL(researchData.link);
    } catch (error) {
      throw new Error("Invalid URL format for link field");
    }

    // Validasi id_kpi_detail harus milik kementerian research
    if (researchData.id_kpi_detail) {
      await validateKpiDetailKementerian(researchData.id_kpi_detail.toString(), "research");
    }

    return await researchRepository.createResearch(researchData);
  },

  getAllResearch: async (filters?: {
    userId?: string;
    id_kpi_detail?: string;
    week?: number;
    progress?: progressStatus;
    status?: ResearchStatus;
    date?: { year: number; month?: number };
  }): Promise<IResearch[]> => {
    return await researchRepository.findResearchWithFilters(filters || {});
  },

  getResearchById: async (researchId: string): Promise<IResearch | null> => {
    return await researchRepository.findResearchById(researchId);
  },

  getResearchByIdWithoutPopulate: async (id: string): Promise<IResearch | null> => {
    return await researchRepository.findResearchByIdWithoutPopulate(id);
  },

  getResearchByUserId: async (userId: string): Promise<IResearch[]> => {
    return await researchRepository.findResearchByUserId(userId);
  },

  getMyResearch: async (userId: string): Promise<IResearch[]> => {
    return await researchRepository.findMyResearch(userId);
  },

  updateResearch: async (researchId: string, updateData: Partial<IResearch>): Promise<any> => {
    const existingResearch = await researchRepository.findResearchById(researchId);
    if (!existingResearch) throw new Error("Research record not found");

    if (updateData.week && updateData.week <= 0) {
      throw new Error("Week number must be a positive integer");
    }

    if (updateData.link) {
      try {
        new URL(updateData.link);
      } catch (error) {
        throw new Error("Invalid URL format for link field");
      }
    }

    if (updateData.id_kpi_detail) {
      await validateKpiDetailKementerian(updateData.id_kpi_detail.toString(), "research");
    }

    const updatedResearch = await researchRepository.updateResearchById(researchId, updateData);
    if (!updatedResearch) return null;

    const { _id, userId, ...responseData } = updatedResearch.toObject();
    return responseData;
  },

  updateMyResearch: async (researchId: string, updateData: Partial<IResearch>): Promise<any> => {
    const existingResearch = await researchRepository.findResearchByIdWithoutPopulate(researchId);
    if (!existingResearch) throw new Error("Research record not found");

    if (updateData.week && updateData.week <= 0) {
      throw new Error("Week number must be a positive integer");
    }

    if (updateData.link) {
      try {
        new URL(updateData.link);
      } catch (error) {
        throw new Error("Invalid URL format for link field");
      }
    }

    if (updateData.id_kpi_detail) {
      await validateKpiDetailKementerian(updateData.id_kpi_detail.toString(), "research");
    }

    const updatedResearch = await researchRepository.updateResearchById(researchId, updateData);
    if (!updatedResearch) return null;

    const { _id, userId, ...responseData } = updatedResearch.toObject();
    return responseData;
  },

  deleteResearch: async (researchId: string): Promise<IResearch | null> => {
    return await researchRepository.deleteResearchById(researchId);
  },

  checkResearchExists: async (userId: string, week: number, title: string): Promise<boolean> => {
    const exists = await researchRepository.researchExists(userId, week, title);
    return !!exists;
  },

  getResearchSummary: async (dateFilter?: { year: number; month?: number }) => {
    const research = await researchRepository.findResearchWithFilters({
      status: { $ne: null } as any,
      ...(dateFilter && { date: dateFilter }),
    });

    const userMap = new Map<string, { userName: string; data: IResearch[] }>();
    research.forEach((r) => {
      const userId = (r.userId as any)?._id?.toString() || r.userId.toString();
      if (!userMap.has(userId)) {
        userMap.set(userId, { userName: (r.userId as any)?.name || "Unknown User", data: [] });
      }
      userMap.get(userId)!.data.push(r);
    });

    const byUser = Array.from(userMap.entries()).map(([userId, userData]) => ({
      userId,
      userName: userData.userName,
      total: userData.data.length,
      data: userData.data,
    }));

    return { totalApproved: research.length, byUser };
  },
};

export default researchService;