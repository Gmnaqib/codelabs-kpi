import { Types } from "mongoose";

export interface IKPI {
  userId: Types.ObjectId;
  month: number;
  year: number;
}

export interface IKPIDetailResult {
  kpiDetailId: Types.ObjectId;
  kpi_item: string;
  label: string;
  point_per_activity: number;
  jumlah_activity: number;
  point_akhir: number;
}

export interface IKPICategoryResult {
  kementerian: string;
  bobot_master: number;
  details: IKPIDetailResult[];
  total_point: number;
}

export interface IKPISummary {
  userId: Types.ObjectId;
  name: string;
  month: number;
  year: number;
  categories: IKPICategoryResult[];
  grand_total: number;
}

export interface TotalPointSummary {
  userId?: Types.ObjectId;
  name: string;
  totalPoint: number;
  year: number;
  month: number;
}

export default IKPI;