import mongoose, { Schema } from "mongoose";
import IOperationalRecord from "./operational.interface";
import { ScheduleType } from "../schedule/schedule.interface";
import { kpiSnapshotSchema } from "../kpi/kpi_snapshot.interface";

const operationalRecordSchema = new Schema<IOperationalRecord>(
  {
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    id_kpi_detail: { type: mongoose.Schema.Types.ObjectId, ref: "KPIDetail", default: null },
    type: { type: String, enum: Object.values(ScheduleType), required: true },
    date: { type: Date, required: true },
    earned_point: { type: Number, default: 0 },
    kpi_snapshot: { type: kpiSnapshotSchema, default: null },
  },
  { timestamps: true }
);

operationalRecordSchema.pre("save", function (next) {
  const dayOfWeek = this.date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    throw new Error("Operational record date must be Monday to Friday only");
  }
  next();
});

const OperationalRecord = mongoose.model<IOperationalRecord>("OperationalRecord", operationalRecordSchema);
export default OperationalRecord;