import competitionRepository from "../repository/competition.respository";
import ICompetition, { CompetitionType, CompetitionStatus } from "../models/competition/competition.interface";
import { validateKpiDetailKementerian } from "../helper/kpi.detail.validator";
import { Types } from "mongoose";

const CompetitionService = {
  addCompetition: async (userId: string, name: string, description: string, deadline: string, link: string, type: CompetitionType, id_kpi_detail?: string): Promise<ICompetition> => {
    if (id_kpi_detail) {
      await validateKpiDetailKementerian(id_kpi_detail, "competition");
    }

    return await competitionRepository.createCompetition({
      userId: new Types.ObjectId(userId),
      name,
      description,
      deadline: new Date(deadline),
      link,
      type,
      ...(id_kpi_detail && { id_kpi_detail: new Types.ObjectId(id_kpi_detail) }),
    });
  },

  findAllCompetitions: async (filters?: any): Promise<ICompetition[]> => {
    if (!filters || Object.keys(filters).length === 0) {
      return await competitionRepository.findAllCompetitions();
    }

    const formattedFilter: any = { ...filters };
    if (filters.userId) formattedFilter.userId = new Types.ObjectId(filters.userId);

    let dateFilter: { year: number; month: number } | undefined;
    if (filters.date) {
      const parsedDate = new Date(filters.date);
      if (isNaN(parsedDate.getTime())) throw new Error("Invalid date format");
      dateFilter = { year: parsedDate.getFullYear(), month: parsedDate.getMonth() + 1 };
    }

    const { date, ...queryFilter } = formattedFilter;
    return await competitionRepository.findCompetitionsByFilter(queryFilter, dateFilter);
  },

  getMyCompetitions: async (userId: string, year?: number, month?: number): Promise<ICompetition[]> => {
    return await competitionRepository.findMyCompetitions(userId, year, month);
  },

  updateMyCompetition: async (id: string, userId: string, updateData: { name?: string; description?: string; deadline?: string; link?: string; type?: CompetitionType; id_kpi_detail?: string }): Promise<any> => {
    const competition = await competitionRepository.findCompetitionById(id);
    if (!competition) throw new Error("Competition not found");
    if (competition.userId.toString() !== userId) throw new Error("You can only update your own competitions");

    if (updateData.id_kpi_detail) {
      await validateKpiDetailKementerian(updateData.id_kpi_detail, "competition");
    }

    const { name, description, deadline, link, type, id_kpi_detail } = updateData;
    if (name !== undefined) competition.name = name;
    if (description !== undefined) competition.description = description;
    if (deadline !== undefined) competition.deadline = new Date(deadline);
    if (link !== undefined) competition.link = link;
    if (type !== undefined) competition.type = type;
    if (id_kpi_detail !== undefined) competition.id_kpi_detail = new Types.ObjectId(id_kpi_detail);

    await competition.save();
    const { _id, userId: uid, ...responseData } = competition.toObject();
    return responseData;
  },

  findCompetitionById: async (id: string): Promise<ICompetition> => {
    const competition = await competitionRepository.findCompetitionById(id);
    if (!competition) throw new Error("Competition not found");
    return competition;
  },

  updateCompetition: async (id: string, updateData: { userId?: string; name?: string; description?: string; deadline?: string; link?: string; status?: CompetitionStatus; type?: CompetitionType; id_kpi_detail?: string }): Promise<ICompetition> => {
    const competition = await competitionRepository.findCompetitionById(id);
    if (!competition) throw new Error("Competition not found");

    if (updateData.id_kpi_detail) {
      await validateKpiDetailKementerian(updateData.id_kpi_detail, "competition");
    }

    const { name, description, deadline, link, status, type, id_kpi_detail } = updateData;
    competition.name = name || competition.name;
    competition.description = description || competition.description;
    competition.deadline = deadline ? new Date(deadline) : competition.deadline;
    competition.link = link || competition.link;
    competition.status = status || competition.status;
    competition.type = type || competition.type;
    if (id_kpi_detail !== undefined) competition.id_kpi_detail = new Types.ObjectId(id_kpi_detail);

    await competition.save();
    return competition;
  },

  deleteCompetition: async (id: string): Promise<ICompetition | null> => {
    const competition = await competitionRepository.findCompetitionById(id);
    if (!competition) throw new Error("Competition not found");
    return await competitionRepository.deleteCompetitionById(id);
  },
};

export default CompetitionService;