import OperationalRecord from "../models/operationalRecord/operational.schema";
import IOperationalRecord from "../models/operationalRecord/operational.interface";
import { ScheduleType } from "../models/schedule/schedule.interface";
import { Types } from "mongoose";

interface OperationalRecordFilter {
  _id?: Types.ObjectId | string;
  scheduleId?: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
  id_kpi_detail?: Types.ObjectId | string;
  type?: ScheduleType;
  date?: Date | { $gte?: Date; $lte?: Date };
  status?: "completed" | "pending" | "cancelled";
  createdAt?: { $gte?: Date; $lte?: Date };
  updatedAt?: { $gte?: Date; $lte?: Date };
}

const operationalRecordRepository = {
  createRecord: (recordData: Partial<IOperationalRecord>) => OperationalRecord.create(recordData),
  findAllRecords: () => OperationalRecord.find().populate(["scheduleId", "userId"]).sort({ date: -1, createdAt: -1 }),
  findRecordById: (id: string) => OperationalRecord.findById(id).populate(["scheduleId", "userId"]),
  findRecordsByFilter: (filter: OperationalRecordFilter) => OperationalRecord.find(filter).populate(["scheduleId", "userId"]).sort({ date: -1, createdAt: -1 }),
  findRecordsByScheduleId: (scheduleId: string) => OperationalRecord.find({ scheduleId }).populate(["scheduleId", "userId"]).sort({ date: -1, createdAt: -1 }),
  findRecordsByUserId: (userId: string) => OperationalRecord.find({ userId }).populate(["scheduleId", "userId"]).sort({ date: -1, createdAt: -1 }),
  findRecordsByType: (type: ScheduleType) => OperationalRecord.find({ type }).populate(["scheduleId", "userId"]).sort({ date: -1, createdAt: -1 }),

  findRecordsByDate: (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return OperationalRecord.find({ date: { $gte: startOfDay, $lte: endOfDay } })
      .populate(["scheduleId", "userId"])
      .sort({ date: -1, createdAt: -1 });
  },

  findRecordsByDateRange: (startDate: Date, endDate: Date) =>
    OperationalRecord.find({ date: { $gte: startDate, $lte: endDate } })
      .populate(["scheduleId", "userId"])
      .sort({ date: -1, createdAt: -1 }),

  findRecordsByStatus: (status: string) => OperationalRecord.find({ status }).populate(["scheduleId", "userId"]).sort({ date: -1, createdAt: -1 }),

  findDuplicateRecord: (scheduleId: Types.ObjectId, userId: Types.ObjectId) =>
    OperationalRecord.findOne({ scheduleId, userId }),

  findRecordsWithFilters: (filters: {
    scheduleId?: string;
    userId?: string;
    id_kpi_detail?: string;
    type?: ScheduleType;
    startDate?: Date;
    endDate?: Date;
    date?: Date;
    status?: string;
  }) => {
    const query: any = {};

    if (filters.scheduleId) query.scheduleId = filters.scheduleId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.id_kpi_detail) query.id_kpi_detail = new Types.ObjectId(filters.id_kpi_detail);
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = filters.startDate;
      if (filters.endDate) query.date.$lte = filters.endDate;
    }

    return OperationalRecord.find(query).sort({ date: -1, createdAt: -1 });
  },

  updateRecordById: (id: string, updateData: Partial<IOperationalRecord>) => OperationalRecord.findByIdAndUpdate(id, updateData, { new: true }).populate(["scheduleId", "userId"]),
  updateRecord: (filter: OperationalRecordFilter, updateData: Partial<IOperationalRecord>) => OperationalRecord.updateOne(filter, updateData),
  deleteRecordById: (id: string) => OperationalRecord.findByIdAndDelete(id),
  deleteRecord: (filter: OperationalRecordFilter) => OperationalRecord.deleteOne(filter),
  countRecords: () => OperationalRecord.countDocuments(),
  countRecordsByFilter: (filter: OperationalRecordFilter) => OperationalRecord.countDocuments(filter),

  countRecordsWithFilters: (filters: {
    scheduleId?: string;
    userId?: string;
    id_kpi_detail?: string;
    type?: ScheduleType;
    startDate?: Date;
    endDate?: Date;
    date?: Date;
    status?: string;
  }) => {
    const query: any = {};

    if (filters.scheduleId) query.scheduleId = filters.scheduleId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.id_kpi_detail) query.id_kpi_detail = new Types.ObjectId(filters.id_kpi_detail);
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = filters.startDate;
      if (filters.endDate) query.date.$lte = filters.endDate;
    }

    return OperationalRecord.countDocuments(query);
  },

  recordExists: (scheduleId: string, userId: string) =>
    OperationalRecord.exists({ scheduleId, userId }),
};

export default operationalRecordRepository;