import Research from "../models/research/research.schema";
import IResearch, { progressStatus, ResearchStatus } from "../models/research/research.interface";
import { Types } from "mongoose";

interface ResearchFilter {
  _id?: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
  id_kpi_detail?: Types.ObjectId | string;
  week?: number;
  title?: string;
  progress?: progressStatus;
  status?: ResearchStatus | { $ne: any } | { $gte: number };
  createdAt?: { $gte?: Date; $lte?: Date };
  updatedAt?: { $gte?: Date; $lte?: Date };
}

const researchRepository = {
  createResearch: (researchData: Partial<IResearch>) => Research.create(researchData),
  findAllResearch: () => Research.find().populate("userId", "name").sort({ createdAt: -1 }),
  findResearchById: (id: string) => Research.findById(id).populate("userId", "name"),
  findResearchByIdWithoutPopulate: (id: string) => Research.findById(id),
  findResearchByFilter: (filter: ResearchFilter) => Research.find(filter).populate("userId", "name").sort({ createdAt: -1 }),
  findResearchByUserId: (userId: string) => Research.find({ userId }).populate("userId", "name").sort({ createdAt: -1 }),
  findMyResearch: (userId: string) => Research.find({ userId }).sort({ createdAt: -1 }),
  findResearchByWeek: (week: number) => Research.find({ week }).populate("userId", "name").sort({ createdAt: -1 }),
  findResearchByProgress: (progress: progressStatus) => Research.find({ progress }).populate("userId", "name").sort({ createdAt: -1 }),
  findResearchByStatus: (status: ResearchStatus) => Research.find({ status }).populate("userId", "name").sort({ createdAt: -1 }),
  findResearchWithFilters: (filters: {
    userId?: string;
    id_kpi_detail?: string;
    week?: number;
    progress?: progressStatus;
    status?: ResearchStatus | { $ne: any };
    date?: { year: number; month?: number };
  }) => {
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.id_kpi_detail) query.id_kpi_detail = new Types.ObjectId(filters.id_kpi_detail);
    if (filters.week) query.week = filters.week;
    if (filters.progress) query.progress = filters.progress;
    if (filters.status) query.status = filters.status;
    if (filters.date) {
      if (filters.date.month) {
        const startDate = new Date(filters.date.year, filters.date.month - 1, 1);
        const endDate = new Date(filters.date.year, filters.date.month, 0, 23, 59, 59, 999);
        query.createdAt = { $gte: startDate, $lte: endDate };
      } else {
        const startDate = new Date(filters.date.year, 0, 1);
        const endDate = new Date(filters.date.year, 11, 31, 23, 59, 59, 999);
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }

    return Research.find(query).populate("userId", "name").sort({ createdAt: -1 });
  },

  findDuplicateResearch: (userId: string, week: number, title: string) => {
    return Research.findOne({
      userId,
      week,
      title: { $regex: `^${title}$`, $options: "i" },
    });
  },

  updateResearchById: (id: string, updateData: Partial<IResearch>) => Research.findByIdAndUpdate(id, updateData, { new: true }).populate("userId", "name"),
  updateResearch: (filter: ResearchFilter, updateData: Partial<IResearch>) => Research.updateOne(filter, updateData),
  deleteResearchById: (id: string) => Research.findByIdAndDelete(id).populate("userId", "name"),
  deleteResearch: (filter: ResearchFilter) => Research.deleteOne(filter),
  countResearch: () => Research.countDocuments(),
  countResearchByFilter: (filter: ResearchFilter) => Research.countDocuments(filter),

  countResearchWithFilters: (filters: {
    userId?: string;
    id_kpi_detail?: string;
    week?: number;
    progress?: progressStatus;
    status?: ResearchStatus;
    date?: { year: number; month?: number };
  }) => {
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.id_kpi_detail) query.id_kpi_detail = new Types.ObjectId(filters.id_kpi_detail);
    if (filters.week) query.week = filters.week;
    if (filters.progress) query.progress = filters.progress;
    if (filters.status) query.status = filters.status;
    if (filters.date) {
      if (filters.date.month) {
        const startDate = new Date(filters.date.year, filters.date.month - 1, 1);
        const endDate = new Date(filters.date.year, filters.date.month, 0, 23, 59, 59, 999);
        query.createdAt = { $gte: startDate, $lte: endDate };
      } else {
        const startDate = new Date(filters.date.year, 0, 1);
        const endDate = new Date(filters.date.year, 11, 31, 23, 59, 59, 999);
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }

    return Research.countDocuments(query);
  },

  researchExists: (userId: string, week: number, title: string) => {
    return Research.exists({
      userId,
      week,
      title: { $regex: `^${title}$`, $options: "i" },
    });
  },

  getResearchStats: async () => {
    const stats = await Research.aggregate([
      {
        $group: {
          _id: null,
          totalResearch: { $sum: 1 },
          finishedResearch: { $sum: { $cond: [{ $eq: ["$progress", "finished"] }, 1, 0] } },
          unfinishedResearch: { $sum: { $cond: [{ $eq: ["$progress", "unfinished"] }, 1, 0] } },
        },
      },
    ]);
    return stats[0] || { totalResearch: 0, finishedResearch: 0, unfinishedResearch: 0 };
  },

  getUserResearchStats: async (userId: string) => {
    const stats = await Research.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalResearch: { $sum: 1 },
          finishedResearch: { $sum: { $cond: [{ $eq: ["$progress", "finished"] }, 1, 0] } },
          unfinishedResearch: { $sum: { $cond: [{ $eq: ["$progress", "unfinished"] }, 1, 0] } },
        },
      },
    ]);
    return stats[0] || { totalResearch: 0, finishedResearch: 0, unfinishedResearch: 0 };
  },
};

export default researchRepository;