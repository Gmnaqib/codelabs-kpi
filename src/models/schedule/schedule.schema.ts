import mongoose, { Schema } from "mongoose";
import ISchedule from "./schedule.interface";

const ScheduleSchema = new Schema<ISchedule>(
  {
    type: { type: String, enum: ["picket", "thematic"], required: true },
    date: { type: Date, required: true },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    description: { type: String },
  },
  { timestamps: true },
);

// Minggu tidak pernah valid untuk jadwal apa pun. Picket masih dibatasi
// Senin-Jumat; Thematic (tidak berulang mingguan seperti picket) boleh
// sampai Sabtu.
ScheduleSchema.pre("save", function (next) {
  const dayOfWeek = this.date.getDay();
  // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
  if (dayOfWeek === 0) {
    throw new Error("Schedule date must be Monday to Saturday only");
  }
  if (this.type === "picket" && dayOfWeek === 6) {
    throw new Error("Picket schedule date must be Monday to Friday only");
  }
  next();
});

export const Schedule = mongoose.model<ISchedule>("Schedule", ScheduleSchema);
export default Schedule;
