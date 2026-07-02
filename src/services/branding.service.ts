import brandingRepository from "../repository/branding.respository";
import IBranding, { BrandingStatus, researchCategory, brandingLevel } from "../models/branding/branding.interface";
import { validateKpiDetailKementerian } from "../helper/kpi.detail.validator";
import { Types } from "mongoose";

const BrandingService = {
  addBranding: async (userId: string, name: string, description: string, link: string, research: researchCategory, level: brandingLevel, id_kpi_detail?: string): Promise<IBranding> => {
    if (id_kpi_detail) {
      await validateKpiDetailKementerian(id_kpi_detail, "branding");
    }

    return await brandingRepository.createBranding({
      userId: new Types.ObjectId(userId),
      name,
      description,
      link,
      research,
      level,
      status: undefined,
      ...(id_kpi_detail && { id_kpi_detail: new Types.ObjectId(id_kpi_detail) }),
    });
  },

  findAllBrandings: async (): Promise<IBranding[]> => {
    return await brandingRepository.findAllBrandings();
  },

  findBrandingsByFilter: async (filter: any): Promise<IBranding[]> => {
    const formattedFilter = { ...filter };
    if (filter.userId) formattedFilter.userId = new Types.ObjectId(filter.userId);

    let dateFilter: { year: number; month: number } | undefined;
    if (filter.date) {
      const parsedDate = new Date(filter.date);
      if (isNaN(parsedDate.getTime())) throw new Error("Invalid date format");
      dateFilter = { year: parsedDate.getFullYear(), month: parsedDate.getMonth() + 1 };
    }

    const { date, ...queryFilter } = formattedFilter;
    return brandingRepository.findBrandingsByFilter(queryFilter, dateFilter);
  },

  getMyBrandings: async (userId: string, year?: number, month?: number): Promise<IBranding[]> => {
    return await brandingRepository.findMyBrandings(userId, year, month);
  },

  getMyBrandingStats: async (userId: string, year?: number, month?: number, week?: number) => {
    const result = await brandingRepository.getMyBrandingStats(userId, { year, month, week });
    if (!result.length) return { total: 0, brandings: [] };
    return { total: result[0].total, brandings: result[0].brandings };
  },

  updateMyBranding: async (id: string, userId: string, updateData: { name?: string; description?: string; link?: string; research?: researchCategory; level?: brandingLevel; id_kpi_detail?: string }): Promise<any> => {
    const branding = await brandingRepository.findBrandingById(id);
    if (!branding) throw new Error("Branding not found");
    if (branding.userId.toString() !== userId) throw new Error("You can only update your own brandings");

    if (updateData.id_kpi_detail) {
      await validateKpiDetailKementerian(updateData.id_kpi_detail, "branding");
    }

    const { name, description, link, research, level, id_kpi_detail } = updateData;
    if (name !== undefined) branding.name = name;
    if (description !== undefined) branding.description = description;
    if (link !== undefined) branding.link = link;
    if (research !== undefined) branding.research = research;
    if (level !== undefined) branding.level = level;
    if (id_kpi_detail !== undefined) branding.id_kpi_detail = new Types.ObjectId(id_kpi_detail);

    await branding.save();
    const { _id, userId: uid, ...responseData } = branding.toObject();
    return responseData;
  },

  findBrandingById: async (id: string): Promise<IBranding> => {
    const branding = await brandingRepository.findBrandingById(id);
    if (!branding) throw new Error("Branding not found");
    return branding;
  },

  updateBranding: async (id: string, updateData: { name?: string; description?: string; link?: string; status?: BrandingStatus; research?: researchCategory; level?: brandingLevel; id_kpi_detail?: string }): Promise<IBranding> => {
    const branding = await brandingRepository.findBrandingById(id);
    if (!branding) throw new Error("Branding not found");

    if (updateData.id_kpi_detail) {
      await validateKpiDetailKementerian(updateData.id_kpi_detail, "branding");
    }

    const { name, description, link, status, research, level, id_kpi_detail } = updateData;
    if (name !== undefined) branding.name = name;
    if (description !== undefined) branding.description = description;
    if (link !== undefined) branding.link = link;
    if (status !== undefined) branding.status = status;
    if (research !== undefined) branding.research = research;
    if (level !== undefined) branding.level = level;
    if (id_kpi_detail !== undefined) branding.id_kpi_detail = new Types.ObjectId(id_kpi_detail);

    await branding.save();
    return branding;
  },

  deleteBranding: async (id: string): Promise<IBranding | null> => {
    const branding = await brandingRepository.findBrandingById(id);
    if (!branding) throw new Error("Branding not found");
    await brandingRepository.deleteBrandingById(id);
    return branding;
  },
};

export default BrandingService;