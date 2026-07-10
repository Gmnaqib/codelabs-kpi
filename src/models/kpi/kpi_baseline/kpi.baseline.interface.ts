import { Types } from "mongoose";

export interface IKPIBaselineDetailSnapshot {
  kpiDetailId: Types.ObjectId;
  kpi_item: string;
  jumlah_activity: number;
  point_akhir: number;
}

export interface IKPIBaseline {
  userId: Types.ObjectId;
  id_kpi_master: Types.ObjectId;
  kementerian: string;
  baseline_point: number;
  migratedAt: Date;
  cutoffDate: Date;
  detailSnapshot: IKPIBaselineDetailSnapshot[];
}

export default IKPIBaseline;
