import Attendance from "../models/attendance/attendance.schema";
import IAttendance, { attendanceStatus, approvalStatus } from "../models/attendance/attendance.Interface";
import { Types } from "mongoose";

interface filterAttendance {
  userId?: Types.ObjectId;
  id_kpi_detail?: Types.ObjectId;
  status?: attendanceStatus;
  start_date?: Date;
  end_date?: Date;
  approval_status?: approvalStatus;
  createdAt?: Date | any;
  checkIn?: Date | any;
  checkOut?: Date | any;
  year?: number;
  month?: number;
  day?: number;
}

const attendanceRepository = {
  create: (data: Partial<IAttendance>) => Attendance.create(data),
  findAll: (filter: Partial<filterAttendance>) => Attendance.find(filter),
  findOne: (filter: Partial<filterAttendance>) => Attendance.findOne(filter),
  findById: (id: Types.ObjectId) => Attendance.findById(id),
  findAllWithApprovalStatus: () => Attendance.find({ approval_status: { $exists: true } }),
  findByApprovalStatus: (status: approvalStatus) => Attendance.find({ approval_status: status }),

  findAllWithApprovalStatusAndDate: async (dateFilter: Partial<filterAttendance>): Promise<IAttendance[]> => {
    const query: any = { approval_status: { $exists: true } };
    const UTC_OFFSET_HOURS = 7;

    if (dateFilter.year !== undefined || dateFilter.month !== undefined || dateFilter.day !== undefined) {
      const startDate = new Date();
      const endDate = new Date();

      if (dateFilter.year !== undefined) {
        startDate.setFullYear(dateFilter.year);
        endDate.setFullYear(dateFilter.year);
      }
      if (dateFilter.month !== undefined) {
        startDate.setMonth(dateFilter.month - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(dateFilter.month, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (dateFilter.year !== undefined) {
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
      }
      if (dateFilter.day !== undefined && dateFilter.month !== undefined && dateFilter.year !== undefined) {
        startDate.setDate(dateFilter.day);
        endDate.setDate(dateFilter.day);
        endDate.setHours(23, 59, 59, 999);
      }

      startDate.setHours(startDate.getHours() - UTC_OFFSET_HOURS);
      endDate.setHours(endDate.getHours() - UTC_OFFSET_HOURS);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    return await Attendance.find(query);
  },

  findAllWithDate: async (dateFilter: Partial<filterAttendance>): Promise<IAttendance[]> => {
    const query: any = {};
    const UTC_OFFSET_HOURS = 7;

    if (dateFilter.userId !== undefined) query.userId = dateFilter.userId;
    if (dateFilter.id_kpi_detail !== undefined) query.id_kpi_detail = dateFilter.id_kpi_detail;

    if (dateFilter.year !== undefined || dateFilter.month !== undefined || dateFilter.day !== undefined) {
      const startDate = new Date();
      const endDate = new Date();

      if (dateFilter.year !== undefined) {
        startDate.setFullYear(dateFilter.year);
        endDate.setFullYear(dateFilter.year);
      }
      if (dateFilter.month !== undefined) {
        startDate.setMonth(dateFilter.month - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(dateFilter.month, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (dateFilter.year !== undefined) {
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
      }
      if (dateFilter.day !== undefined && dateFilter.month !== undefined && dateFilter.year !== undefined) {
        startDate.setDate(dateFilter.day);
        endDate.setDate(dateFilter.day);
        endDate.setHours(23, 59, 59, 999);
      }

      startDate.setHours(startDate.getHours() - UTC_OFFSET_HOURS);
      endDate.setHours(endDate.getHours() - UTC_OFFSET_HOURS);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    return await Attendance.find(query);
  },
};

export default attendanceRepository;