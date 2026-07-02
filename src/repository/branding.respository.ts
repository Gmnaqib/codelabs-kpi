import Branding from "../models/branding/branding.schema";
import IBranding, { BrandingStatus, researchCategory, brandingLevel } from "../models/branding/branding.interface";
import { Types } from "mongoose";

interface BrandingFilter {
  _id?: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
  id_kpi_detail?: Types.ObjectId | string;
  name?: string;
  description?: string;
  link?: string;
  status?: BrandingStatus | { $ne: any } | { $gte: number };
  type?: researchCategory;
  level?: brandingLevel;
}

const brandingRepository = {
  createBranding: (brandingData: Partial<IBranding>) => Branding.create(brandingData),
  findAllBrandings: () => Branding.find(),
  findMyBrandings: (userId: string, year?: number, month?: number) => {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (year !== undefined && month !== undefined) {
      query.createdAt = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59, 999),
      };
    } else if (year !== undefined) {
      query.createdAt = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }
    return Branding.find(query);
  },
  findBrandingById: (id: string) => Branding.findById(id),
  findBranding: (filter: BrandingFilter) => Branding.findOne(filter),
  findBrandingsByFilter: (filter: BrandingFilter, date?: { year: number; month: number }) => {
    const query: any = { ...filter };
    if (date) {
      query.createdAt = {
        $gte: new Date(date.year, date.month - 1, 1),
        $lte: new Date(date.year, date.month, 0, 23, 59, 59, 999),
      };
    }
    return Branding.find(query);
  },
  getMyBrandingStats: (userId: string, filter?: { year?: number; month?: number; week?: number }) => {
    const match: any = { userId: new Types.ObjectId(userId) };
    if (filter?.year) {
      const start = new Date(filter.year, 0, 1);
      const end = new Date(filter.year, 11, 31, 23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    }
    if (filter?.month && filter?.year) {
      const start = new Date(filter.year, filter.month - 1, 1);
      const end = new Date(filter.year, filter.month, 0, 23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    }
    return Branding.aggregate([
      { $match: match },
      { $group: { _id: "$userId", total: { $sum: 1 }, brandings: { $push: "$$ROOT" } } },
    ]);
  },
  updateBrandingById: (id: string, updateData: Partial<IBranding>) => Branding.findByIdAndUpdate(id, updateData, { new: true }),
  updateBranding: (filter: BrandingFilter, updateData: Partial<IBranding>) => Branding.updateOne(filter, updateData),
  deleteBrandingById: (id: string) => Branding.findByIdAndDelete(id),
  deleteBranding: (filter: BrandingFilter) => Branding.deleteOne(filter),
};

export default brandingRepository;