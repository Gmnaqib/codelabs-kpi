import { Types } from "mongoose";

export const statusBranding = {
  NOT_SUITABLE: 0,
  POOR: 1,
  FAIR: 2,
  GOOD: 3,
  VERY_GOOD: 4,
  EXCELLENT: 5,
} as const;

export const BRANDING_STATUS_LABELS: Record<BrandingStatus, string> = {
  0: "Tidak Sesuai",
  1: "Kurang Baik",
  2: "Cukup Baik",
  3: "Baik",
  4: "Sangat Baik",
  5: "Luar Biasa",
};

export type BrandingStatus = typeof statusBranding[keyof typeof statusBranding];
export const BRANDING_STATUS_VALUES = Object.values(statusBranding);

export enum researchCategory {
  website = "website",
  mobile = "mobile",
  game = "game",
  ui = "ui/ux",
  data = "data",
  other = "other",
}

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
  research: researchCategory;
  level: string;
  link: string;
  status?: BrandingStatus;  // null = belum direview, 0-5 = nilai dari admin
  createdAt?: Date;
}

export default IBranding;