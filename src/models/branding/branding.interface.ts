import { Types } from "mongoose";
import { IKPISnapshot } from "../kpi/kpi_snapshot.interface";

export const statusBranding = {
  NOT_SUITABLE: 0,
  POOR: 1,
  FAIR: 2,
  GOOD: 3,
  VERY_GOOD: 4,
  EXCELLENT: 5,
} as const;

export const BRANDING_STATUS_LABELS: Record<BrandingStatus, string> = {
  0: "Not Suitable",
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export type BrandingStatus = typeof statusBranding[keyof typeof statusBranding];
export const BRANDING_STATUS_VALUES = Object.values(statusBranding);

export enum brandingLevel {
  Beginner = "beginner",
  Intermediate = "intermediate",
  Advanced = "advanced",
}

interface IBranding {
  userId: Types.ObjectId;
  id_kpi_detail: Types.ObjectId;
  name: string;
  description: string;
  research: string;
  level: string;
  link: string;
  status?: BrandingStatus; 
  earned_point?: number;     
  kpi_snapshot?: IKPISnapshot;
  createdAt?: Date;
  updatedAt?: Date;
}

export default IBranding;