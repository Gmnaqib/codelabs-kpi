import { Types } from "mongoose";

export enum KPILabel {
  REQUIRED = "REQUIRED",
  OPTIONAL = "OPTIONAL",
}

export interface IKPIMaster {
  kementerian: string;
  point: number;
}

export interface IKPIDetail {
  kpi_item: string;
  point: number;
  id_kpi_master: Types.ObjectId;
  label: KPILabel;
  max_activity: number;
}

export default IKPIMaster;
