import { Schema, model } from "mongoose";
import mongoose from "mongoose";
import IAttendance, { approvalStatus, attendanceStatus } from "./attendance.Interface";

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    id_kpi_detail: { type: mongoose.Schema.Types.ObjectId, ref: "KPIDetail", default: null },
    status: {
      type: String,
      enum: Object.values(attendanceStatus),
      default: attendanceStatus.PRESENT,
      required: true,
    },
    checkIn: { type: Date },
    checkOut: { type: Date },
    reason: { type: String },
    reasonCheckOut: { type: String },
    start_date: { type: Date },
    end_date: { type: Date },
    attachment_url: { type: String },
    approval_status: { type: String, enum: Object.values(approvalStatus) },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

attendanceSchema.pre("save", function (next) {
  if (this.status !== attendanceStatus.PRESENT && this.status !== attendanceStatus.ABSENT) {
    if (!this.approval_status) this.approval_status = approvalStatus.PENDING;
    if (!this.reason) return next(new Error("reason need to be filled if status is not PRESENT"));
    if (!this.start_date) return next(new Error("start_date need to be filled if status is not PRESENT"));
    if (!this.end_date) return next(new Error("end_date need to be filled if status is not PRESENT"));
    if (!this.attachment_url) return next(new Error("attachment_url need to be filled if status is not PRESENT"));
  }
  next();
});

const Attendance = model("Attendance", attendanceSchema);
export default Attendance;