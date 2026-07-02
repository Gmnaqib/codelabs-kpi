import { Types } from "mongoose";

interface ICompetition {
  userId: Types.ObjectId;
  id_kpi_detail: Types.ObjectId;
  name: string;
  description: string;
  deadline: Date;
  link: string;
  status: CompetitionStatus;
  type: CompetitionType;
  createdAt?: Date;
}

export enum CompetitionType {
  National = "national",
  International = "international",
}

export enum CompetitionStatus {
  Approved = "approved",
  Rejected = "rejected",
  Pending = "pending",
}

export default ICompetition;