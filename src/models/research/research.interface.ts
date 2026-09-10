import { Types } from "mongoose";
import { IKPISnapshot } from "../kpi/kpi_snapshot.interface";

interface IResearch {
  userId: Types.ObjectId;
  id_kpi_detail: Types.ObjectId;
  week: number;
  title: string;
  link: string;
  progress: progressStatus;
  challenge?: string;
  status?: ResearchStatus;
  earned_point?: number;        
  kpi_snapshot?: IKPISnapshot;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum progressStatus {
  Finished = "finished",
  Unfinished = "unfinished",
}

export const statusResearch = {
  NOT_SUITABLE: 0,
  POOR: 1,
  FAIR: 2,
  GOOD: 3,
  VERY_GOOD: 4,
  EXCELLENT: 5,
} as const;

export const RESEARCH_STATUS_LABELS: Record<ResearchStatus, string> = {
  0: "Not Suitable",
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export type ResearchStatus = typeof statusResearch[keyof typeof statusResearch];
export const RESEARCH_STATUS_VALUES = Object.values(statusResearch);

export default IResearch;