import { Schema, model } from "mongoose";
import IKPIMaster, { IKPIDetail, KPILabel } from "./kpi.item.interface";

const kpiMasterSchema = new Schema<IKPIMaster>(
  {
    kementerian: {
      type: String,
      required: true,
      unique: true,
    },
    point: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

const kpiDetailSchema = new Schema<IKPIDetail>(
  {
    kpi_item: {
      type: String,
      required: true,
    },
    point: {
      type: Number,
      required: true,
    },
    id_kpi_master: {
      type: Schema.Types.ObjectId,
      ref: "KPIMaster",
      required: true,
    },
    label: {
      type: String,
      enum: Object.values(KPILabel),
      required: true,
    },
    max_activity: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

export const KPIMaster = model<IKPIMaster>("KPIMaster", kpiMasterSchema, "kpi_masters");
export const KPIDetail = model<IKPIDetail>("KPIDetail", kpiDetailSchema, "kpi_details");

export default KPIMaster;