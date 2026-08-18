import { Schema, model } from "mongoose";
import mongoose from "mongoose";
import ICompetition, { CompetitionStatus, CompetitionType } from "./competition.interface";
import { kpiSnapshotSchema } from "../kpi/kpi_snapshot.interface";

const competitionSchema = new Schema<ICompetition>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    id_kpi_detail: { type: mongoose.Schema.Types.ObjectId, ref: "KPIDetail", default: null },
    name: { type: String, required: true },
    description: { type: String, required: true },
    deadline: { type: Date, required: true },
    link: { type: String, required: true },
    status: {
        type: String,
        enum: Object.values(CompetitionStatus),
        default: CompetitionStatus.Pending,
        required: true,
    },
    type: {
        type: String,
        enum: Object.values(CompetitionType),
        required: true,
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
  { timestamps: true }
);

const Competition = model<ICompetition>("Competition", competitionSchema);
export default Competition;