import { Schema, model } from "mongoose";
import IResearch, { RESEARCH_STATUS_VALUES, progressStatus } from "./research.interface";
import { kpiSnapshotSchema } from "../kpi/kpi_snapshot.interface";

const researchSchema = new Schema<IResearch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    week: { type: Number, required: true },
    id_kpi_detail: {
      type: Schema.Types.ObjectId,
      ref: "KPIDetail",
      required: false,
      default: null,
    },
    title: { type: String, required: true },
    link: { type: String, required: true },
    progress: {
      type: String,
      enum: Object.values(progressStatus),
      required: true,
    },
    challenge: { type: String, required: false },
    status: {
      type: Number,
      enum: RESEARCH_STATUS_VALUES,
      default: null,
      min: 0,
      max: 5,
      required: false,
    },
    earned_point: {
      type: Number,
      default: 0,
    },
    kpi_snapshot: {
      type: kpiSnapshotSchema,
      default: null,
    },
  },
  { timestamps: true },
);

const Research = model<IResearch>("Research", researchSchema);

export default Research;