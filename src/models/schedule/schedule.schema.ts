import mongoose, { Schema } from "mongoose";
import ISchedule from "./schedule.interface";
import dateHelper from "../../helper/dateHelper";

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

// Minggu tidak pernah valid untuk jadwal apa pun (picket maupun thematic) —
// keduanya boleh Senin-Sabtu.
ScheduleSchema.pre("save", function (next) {
  const dayOfWeek = dateHelper.getDayOfWeekWIB(this.date);
  // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  if (dayOfWeek === 0) {
    throw new Error("Schedule date must be Monday to Saturday only");
  }
  next();
});

export const Schedule = mongoose.model<ISchedule>("Schedule", ScheduleSchema);
export default Schedule;
