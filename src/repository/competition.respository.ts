import Competition from "../models/competition/competition.schema";
import ICompetition, { CompetitionStatus, CompetitionType } from "../models/competition/competition.interface";
import { Types } from "mongoose";

interface CompetitionFilter {
  _id?: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
  id_kpi_detail?: Types.ObjectId | string;
  name?: string;
  description?: string;
  deadline?: Date;
  link?: string;
  status?: CompetitionStatus;
  type?: CompetitionType;
}

const competitionRepository = {
  createCompetition: (competitionData: Partial<ICompetition>) => Competition.create(competitionData),
  findAllCompetitions: () => Competition.find(),
  findMyCompetitions: (userId: string, year?: number, month?: number) => {
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
    return Competition.find(query);
  },
  findCompetitionById: (id: string) => Competition.findById(id),
  findCompetition: (filter: CompetitionFilter) => Competition.findOne(filter),
  findCompetitionsByFilter: (filter: CompetitionFilter, date?: { year: number; month: number }) => {
    const query: any = { ...filter };
    if (date) {
      query.createdAt = {
        $gte: new Date(date.year, date.month - 1, 1),
        $lte: new Date(date.year, date.month, 0, 23, 59, 59, 999),
      };
    }
    return Competition.find(query);
  },
  updateCompetitionById: (id: string, updateData: Partial<ICompetition>) => Competition.findByIdAndUpdate(id, updateData, { new: true }),
  updateCompetition: (filter: CompetitionFilter, updateData: Partial<ICompetition>) => Competition.updateOne(filter, updateData),
  deleteCompetitionById: (id: string) => Competition.findByIdAndDelete(id),
  deleteCompetition: (filter: CompetitionFilter) => Competition.deleteOne(filter),
};

export default competitionRepository;