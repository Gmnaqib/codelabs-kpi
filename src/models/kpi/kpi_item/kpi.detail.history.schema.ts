import { Schema, model, Types } from "mongoose";

// Append-only log of a KPIDetail's point/max_activity/label over time, so a
// past month's REQUIRED-item cap can be computed against whatever value was
// actually in effect back then instead of today's live value. One entry is
// written whenever the detail is created or one of these fields changes.
export interface IKPIDetailHistory {
  id_kpi_detail: Types.ObjectId;
  point: number;
  max_activity: number;
  label: string;
  effectiveFrom: Date;
}

const kpiDetailHistorySchema = new Schema<IKPIDetailHistory>(
  {
    id_kpi_detail: { type: Schema.Types.ObjectId, ref: "KPIDetail", required: true },
    point: { type: Number, required: true },
    max_activity: { type: Number, required: true },
    label: { type: String, required: true },
    effectiveFrom: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

kpiDetailHistorySchema.index({ id_kpi_detail: 1, effectiveFrom: -1 });

export const KPIDetailHistory = model<IKPIDetailHistory>("KPIDetailHistory", kpiDetailHistorySchema, "kpi_detail_history");
export default KPIDetailHistory;
