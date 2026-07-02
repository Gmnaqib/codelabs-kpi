import { Types } from "mongoose";

interface IResearch {
  userId: Types.ObjectId;
  week: number;
  id_kpi_detail: Types.ObjectId;
  title: string;
  link: string;
  progress: progressStatus;
  challenge?: string;
  status?: ResearchStatus;
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
  0: "Tidak Sesuai",
  1: "Kurang Baik",
  2: "Cukup Baik",
  3: "Baik",
  4: "Sangat Baik",
  5: "Luar Biasa",
};

export type ResearchStatus = typeof statusResearch[keyof typeof statusResearch];
export const RESEARCH_STATUS_VALUES = Object.values(statusResearch);

export default IResearch;