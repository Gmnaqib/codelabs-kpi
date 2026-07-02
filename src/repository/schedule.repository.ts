import Schedule from "../models/schedule/schedule.schema";
import ISchedule, { ScheduleType } from "../models/schedule/schedule.interface";
import { Types } from "mongoose";

// Type-safe filter interface
interface ScheduleFilter {
  _id?: Types.ObjectId | string;
  type?: ScheduleType;
  date?: Date | { $gte?: Date; $lte?: Date; $lt?: Date };
  description?: string;
  assignedUsers?: Types.ObjectId | string;
}

const scheduleRepository = {
  createSchedule: (scheduleData: Partial<ISchedule>) => Schedule.create(scheduleData),
  findAllSchedules: () => Schedule.find().populate("assignedUsers", "_id nim name").sort({ date: -1, createdAt: -1 }),
  findScheduleById: (id: Types.ObjectId) => Schedule.findById(id).populate("assignedUsers", "_id nim name"),
  findSchedule: (filter: ScheduleFilter) => Schedule.findOne(filter).populate("assignedUsers", "_id nim name"),
  findSchedulesByType: (type: ScheduleType) => Schedule.find({ type }).populate("assignedUsers", "_id nim name").sort({ date: -1, createdAt: -1 }),

  findSchedulesByDate: (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Schedule.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("assignedUsers", "_id nim name")
      .sort({ date: -1, createdAt: -1 });
  },

  findSchedulesByTypeAndDate: (type: ScheduleType, date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Schedule.find({
      type,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("assignedUsers", "_id nim name")
      .sort({ date: -1, createdAt: -1 });
  },

  findSchedulesByDateRange: (startDate: Date, endDate: Date) =>
    Schedule.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("assignedUsers", "_id nim name")
      .sort({ date: 1 }),

  findSchedulesByTypeAndDateRange: (type: ScheduleType, startDate: Date, endDate: Date) =>
    Schedule.find({
      type,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("assignedUsers", "_id nim name")
      .sort({ date: 1 }),

  deleteSchedulesByTypeAndDate: (type: ScheduleType, date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Schedule.deleteMany({
      type,
      date: { $gte: startOfDay, $lte: endOfDay },
    });
  },

  updateScheduleById: (id: Types.ObjectId, updateData: Partial<ISchedule>) => Schedule.findByIdAndUpdate(id, updateData, { new: true }).populate("assignedUsers", "_id nim name"),
  updateSchedule: (filter: ScheduleFilter, updateData: Partial<ISchedule>) => Schedule.updateOne(filter, updateData),
  deleteScheduleById: (id: Types.ObjectId) => Schedule.findByIdAndDelete(id),
  deleteSchedule: (filter: ScheduleFilter) => Schedule.deleteOne(filter),
};

export default scheduleRepository;
