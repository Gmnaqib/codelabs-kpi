import { Schema, model } from "mongoose";
import IKPIBaseline, { IKPIBaselineDetailSnapshot } from "./kpi.baseline.interface";

const kpiBaselineDetailSnapshotSchema = new Schema<IKPIBaselineDetailSnapshot>(
  {
    kpiDetailId: { type: Schema.Types.ObjectId, ref: "KPIDetail", required: true },
    kpi_item: { type: String, required: true },
    jumlah_activity: { type: Number, required: true },
    point_akhir: { type: Number, required: true },
  },
  { _id: false },
);

const kpiBaselineSchema = new Schema<IKPIBaseline>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    id_kpi_master: { type: Schema.Types.ObjectId, ref: "KPIMaster", required: true },
    kementerian: { type: String, required: true },
    baseline_point: { type: Number, required: true },
    migratedAt: { type: Date, required: true },
    cutoffDate: { type: Date, required: true },
    detailSnapshot: { type: [kpiBaselineDetailSnapshotSchema], default: [] },
  },
  { timestamps: true },
);

kpiBaselineSchema.index({ userId: 1, id_kpi_master: 1 }, { unique: true });

export const KPIBaseline = model<IKPIBaseline>("KPIBaseline", kpiBaselineSchema, "kpi_baselines");

export default KPIBaseline;
