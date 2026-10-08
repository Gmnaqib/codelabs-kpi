import Schedule from "../models/schedule/schedule.schema";
import ISchedule, { ScheduleType } from "../models/schedule/schedule.interface";
import { Types } from "mongoose";
import dateHelper from "../helper/dateHelper";

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
    const startOfDay = dateHelper.getStartOfDayWIB(date);
    const endOfDay = dateHelper.getEndOfDayWIB(date);

    return Schedule.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("assignedUsers", "_id nim name")
      .sort({ date: -1, createdAt: -1 });
  },

  findSchedulesByTypeAndDate: (type: ScheduleType, date: Date) => {
    const startOfDay = dateHelper.getStartOfDayWIB(date);
    const endOfDay = dateHelper.getEndOfDayWIB(date);

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

  // Updates the existing schedule doc for that type+date in place (keeping
  // its _id, so any OperationalRecord.scheduleId referencing it stays valid)
  // or creates one if none exists yet — replaces the old delete-then-create
  // pattern that orphaned completion records on resubmit.
  upsertScheduleByTypeAndDate: (type: ScheduleType, date: Date, scheduleData: Partial<ISchedule>) => {
    const startOfDay = dateHelper.getStartOfDayWIB(date);
    const endOfDay = dateHelper.getEndOfDayWIB(date);

    return Schedule.findOneAndUpdate(
      { type, date: { $gte: startOfDay, $lte: endOfDay } },
      { $set: scheduleData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("assignedUsers", "_id nim name");
  },

  // Appends user(s) to a specific day's picket schedule (creating it if it
  // doesn't exist yet) without touching any other field or day — distinct
  // from upsertScheduleByTypeAndDate above, which replaces the whole
  // assignedUsers list.
  addUsersToPicketScheduleByDate: (date: Date, userIds: Types.ObjectId[]) => {
    const startOfDay = dateHelper.getStartOfDayWIB(date);
    const endOfDay = dateHelper.getEndOfDayWIB(date);

    return Schedule.findOneAndUpdate(
      { type: ScheduleType.picket, date: { $gte: startOfDay, $lte: endOfDay } },
      {
        $addToSet: { assignedUsers: { $each: userIds } },
        $setOnInsert: { type: ScheduleType.picket, date: startOfDay },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("assignedUsers", "_id nim name");
  },

  updateScheduleById: (id: Types.ObjectId, updateData: Partial<ISchedule>) => Schedule.findByIdAndUpdate(id, updateData, { new: true }).populate("assignedUsers", "_id nim name"),
  updateSchedule: (filter: ScheduleFilter, updateData: Partial<ISchedule>) => Schedule.updateOne(filter, updateData),
  deleteScheduleById: (id: Types.ObjectId) => Schedule.findByIdAndDelete(id),
  deleteSchedule: (filter: ScheduleFilter) => Schedule.deleteOne(filter),
};

export default scheduleRepository;
