import attendanceRepository from "../repository/attendance.repository";
import attendanceValidate from "../validators/attendance.validator";
import userRepository from "../repository/user.repository";
import leaveRequestValidate from "../validators/leaveRequest.validator";
import operationalRecordService from "./operationalRecord.service";
import IAttendance, { attendanceStatus, approvalStatus } from "../models/attendance/attendance.Interface";
import { Status } from "../models/user/user.interface";
import { ScheduleType } from "../models/schedule/schedule.interface";
import { resolveKpiDetailId } from "../helper/kpi.detail.validator";
import { Types } from "mongoose";
import dateHelper from "../helper/dateHelper";

const convertRecordsToIndonesiaTime = (records: any[]): any[] => {
  return records.map((r) => ({
    ...r,
    date: r.date ? dateHelper.formatToIndonesiaTimeISO(r.date) : null,
    createdAt: r.createdAt ? dateHelper.formatToIndonesiaTimeISO(r.createdAt) : null,
  }));
};

const convertAttendanceToIndonesiaTime = (record: any) => {
  if (!record) return record;

  const plainRecord = typeof record.toObject === "function" ? record.toObject() : JSON.parse(JSON.stringify(record));

  return {
    ...plainRecord,
    checkIn: plainRecord.checkIn ? dateHelper.formatToIndonesiaTimeISO(new Date(plainRecord.checkIn)) : null,
    checkOut: plainRecord.checkOut ? dateHelper.formatToIndonesiaTimeISO(new Date(plainRecord.checkOut)) : null,
    start_date: plainRecord.start_date ? dateHelper.formatToIndonesiaTimeISO(new Date(plainRecord.start_date)) : null,
    end_date: plainRecord.end_date ? dateHelper.formatToIndonesiaTimeISO(new Date(plainRecord.end_date)) : null,
    createdAt: plainRecord.createdAt ? dateHelper.formatToIndonesiaTimeISO(new Date(plainRecord.createdAt)) : null,
    updatedAt: plainRecord.updatedAt ? dateHelper.formatToIndonesiaTimeISO(new Date(plainRecord.updatedAt)) : null,
  };
};

const attendanceService = {
  checkIn: async (userId: Types.ObjectId, clientIp: string, reason?: string): Promise<IAttendance> => {
    const validationResult = await attendanceValidate.checkIn(userId, clientIp, reason);
    const userObjectId = new Types.ObjectId(userId);
    // FE tidak mengirim id_kpi_detail saat checkin, jadi dicocokkan otomatis dari kpi_item "attendance" di kementerian operational
    const id_kpi_detail = await resolveKpiDetailId("operational", "attendance");

    if (validationResult.isLateCheckIn) {
      const record = await attendanceRepository.create({
        userId: userObjectId,
        id_kpi_detail,
        status: attendanceStatus.PRESENT,
        checkIn: new Date(),
        checkOut: null,
        reason: reason,
      });
      return convertAttendanceToIndonesiaTime(record);
    }

    const record = await attendanceRepository.create({
      userId: userObjectId,
      id_kpi_detail,
      status: attendanceStatus.PRESENT,
      checkIn: new Date(),
      checkOut: null,
    });
    return convertAttendanceToIndonesiaTime(record);
  },

  checkOut: async (userId: Types.ObjectId, clientIp: string): Promise<IAttendance> => {
    const userObjectId = new Types.ObjectId(userId);

    await attendanceValidate.checkOut(userObjectId, clientIp);

    const startOfDay = dateHelper.getStartOfDayWIB();
    const endOfDay = dateHelper.getEndOfDayWIB();

    const userAttendance = await attendanceRepository.findOne({
      userId: userObjectId,
      checkIn: { $gte: startOfDay, $lt: endOfDay },
    });

    if (!userAttendance) {
      throw new Error("Attendance not found");
    }

    if (userAttendance.checkOut != null) {
      throw new Error("You have already checked out");
    }

    const checkOutTime = new Date();
    userAttendance.checkOut = checkOutTime;
    const result = await userAttendance.save();

    try {
      await operationalRecordService.createOperationalRecord({
        userId: userObjectId,
        type: ScheduleType.thematic,
        date: new Date(),
      } as any);
    } catch (error) {
      console.log("Operational record creation skipped:", (error as any).message);
    }

    return convertAttendanceToIndonesiaTime(result);
  },

  submitleaveRequest: async (
    userId: string,
    type: attendanceStatus,
    reason?: string,
    attachment_url?: string,
    start_date?: Date,
    end_date?: Date,
    approvalStatus?: approvalStatus.PENDING,
  ): Promise<IAttendance> => {
    const userObjectId = new Types.ObjectId(userId);
    const record = await attendanceRepository.create({
      userId: userObjectId,
      status: type,
      reason: reason,
      attachment_url: attachment_url,
      start_date: start_date,
      end_date: end_date,
      approval_status: approvalStatus,
    });
    return convertAttendanceToIndonesiaTime(record);
  },

  getLeaveRequests: async (year?: number, month?: number, day?: number): Promise<IAttendance[]> => {
    if (year !== undefined || month !== undefined || day !== undefined) {
      const records = await attendanceRepository.findAllWithApprovalStatusAndDate({ year, month, day });
      return records.map(convertAttendanceToIndonesiaTime);
    }
    const records = await attendanceRepository.findAllWithApprovalStatus();
    return records.map(convertAttendanceToIndonesiaTime);
  },

  getLeaveRequestById: async (attendanceId: Types.ObjectId): Promise<IAttendance> => {
    const attendanceData = await attendanceRepository.findById(attendanceId);
    if (!attendanceData) {
      throw new Error("Attendance ID is required");
    }
    return convertAttendanceToIndonesiaTime(attendanceData);
  },

  reviewLeaveRequest: async (reviewerUserId: Types.ObjectId, attendanceId: Types.ObjectId, approvalStatus: approvalStatus): Promise<void> => {
    await leaveRequestValidate.reviewLeaveRequest(reviewerUserId, attendanceId, approvalStatus);
    const searchLeaveRequest = await attendanceRepository.findById(attendanceId);
    searchLeaveRequest!.approved_by = reviewerUserId;
    searchLeaveRequest!.approval_status = approvalStatus;
    await searchLeaveRequest!.save();
  },

  checkinByAdmin: async (targetUserId: Types.ObjectId): Promise<IAttendance> => {
    const userObjectId = new Types.ObjectId(targetUserId);
    const startOfDay = dateHelper.getStartOfDayWIB();
    const endOfDay = dateHelper.getEndOfDayWIB();

    const existing = await attendanceRepository.findOne({
      userId: userObjectId,
      checkIn: { $gte: startOfDay, $lt: endOfDay },
    });

    if (existing) {
      throw new Error("User has already checked in today");
    }

    const id_kpi_detail = await resolveKpiDetailId("operational", "attendance");

    const record = await attendanceRepository.create({
      userId: userObjectId,
      id_kpi_detail,
      status: attendanceStatus.PRESENT,
      checkIn: new Date(),
      checkOut: null,
    });

    return convertAttendanceToIndonesiaTime(record);
  },

  getAttendance: async (year?: number, month?: number, day?: number): Promise<IAttendance[]> => {
    if (year !== undefined || month !== undefined || day !== undefined) {
      const records = await attendanceRepository.findAllWithDate({ year, month, day });
      return records.map(convertAttendanceToIndonesiaTime);
    }
    const records = await attendanceRepository.findAll({});
    return records.map(convertAttendanceToIndonesiaTime);
  },

  getAttendanceSummary: async (year?: number, month?: number, day?: number): Promise<any> => {
    let attendanceRecords: IAttendance[];

    if (year !== undefined || month !== undefined || day !== undefined) {
      attendanceRecords = await attendanceRepository.findAllWithDate({ year, month, day });
    } else {
      attendanceRecords = await attendanceRepository.findAll({});
    }

    const userGroups = new Map<string, IAttendance[]>();
    attendanceRecords.forEach((record) => {
      const userIdStr = record.userId.toString();
      if (!userGroups.has(userIdStr)) {
        userGroups.set(userIdStr, []);
      }
      userGroups.get(userIdStr)!.push(record);
    });

    // Get all active users
    const allUsers = await userRepository.findUsersByFilter({ status: Status.active });

    // Create a map of users who have attendance data
    const attendanceUserMap = new Map<string, IAttendance[]>();
    userGroups.forEach((records, userId) => {
      attendanceUserMap.set(userId, records);
    });

    const userSummary = allUsers.map((user) => {
      const userId = user._id?.toString() || "";
      const records = attendanceUserMap.get(userId) || [];

      if (records.length > 0) {
        // User has attendance data
        const userLate = records.filter((r) => r.status === "present" && r.reason).length;
        const userPresent = records.filter((r) => r.status === "present" && !r.reason).length;
        const userSick = records.filter((r) => r.status === "sick").length;
        const userPermit = records.filter((r) => r.status === "permit").length;
        const rejectedSickPermit = records.filter((r) => (r.status === "sick" || r.status === "permit") && r.approval_status === "rejected").length;

        let startOfPeriod = new Date();
        let endOfPeriod = new Date();

        const today = new Date();
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        if (year !== undefined && month !== undefined) {
          startOfPeriod = new Date(year, month - 1, 1, 0, 0, 0, 0);
          endOfPeriod = todayEnd;
        } else if (year !== undefined) {
          startOfPeriod = new Date(year, 0, 1, 0, 0, 0, 0);
          endOfPeriod = todayEnd;
        } else {
          startOfPeriod = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
          endOfPeriod = todayEnd;
        }

        // Collect dates that have data
        const datesWithData = new Set<string>();
        records.forEach((r) => {
          const dateStr = new Date(r.createdAt ?? new Date()).toISOString().split("T")[0];
          datesWithData.add(dateStr);
        });

        // Count missing dates (Monday-Saturday only)
        let missingDateCount = 0;
        const currentDate = new Date(startOfPeriod);
        while (currentDate <= endOfPeriod) {
          const dateStr = currentDate.toISOString().split("T")[0];
          const dayOfWeek = currentDate.getDay();

          if (dayOfWeek !== 0 && !datesWithData.has(dateStr)) {
            missingDateCount++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const userAbsent = rejectedSickPermit + missingDateCount;

        const counts: any = {};
        if (userLate > 0) counts.late = userLate;
        if (userPresent > 0) counts.present = userPresent;
        if (userSick > 0) counts.sick = userSick;
        if (userPermit > 0) counts.permit = userPermit;
        if (userAbsent > 0) counts.absent = userAbsent;

        return { userId, userName: user.name, counts };
      } else {
        const today = new Date();
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        let startOfPeriod = new Date();
        if (year !== undefined && month !== undefined) {
          startOfPeriod = new Date(year, month - 1, 1, 0, 0, 0, 0);
        } else if (year !== undefined) {
          startOfPeriod = new Date(year, 0, 1, 0, 0, 0, 0);
        } else {
          startOfPeriod = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
        }

        // Count working days (Monday-Saturday) from start to today
        let absentDays = 0;
        const currentDate = new Date(startOfPeriod);
        while (currentDate <= todayEnd) {
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0) {
            // Not Sunday
            absentDays++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const counts: any = {
          late: 0,
          present: 0,
          sick: 0,
          permit: 0,
          absent: absentDays,
        };

        return { userId, userName: user.name, counts };
      }
    });

    return userSummary;
  },

  getAttendanceSummaryDetail: async (userId: Types.ObjectId, year?: number, month?: number, day?: number): Promise<any> => {
    let attendanceRecords: IAttendance[];

    if (year !== undefined || month !== undefined || day !== undefined) {
      attendanceRecords = await attendanceRepository.findAllWithDate({ userId, year, month, day });
    } else {
      attendanceRecords = await attendanceRepository.findAll({ userId });
    }

    let userName = "Unknown User";
    try {
      const user = await userRepository.findUserById(userId.toString());
      if (user) {
        userName = user.name;
      }
    } catch (error) {
      userName = "Unknown User";
    }

    const statusSummary: any[] = [];

    // Late - Present dengan reason
    const lateRecords = attendanceRecords.filter((r) => r.status === "present" && r.reason);
    if (lateRecords.length > 0) {
      statusSummary.push({
        status: "late",
        count: lateRecords.length,
        records: convertRecordsToIndonesiaTime(
          lateRecords.map((r) => ({
            date: r.createdAt,
            reason: r.reason,
            attendanceStatus: r.status,
          })),
        ),
      });
    }

    // Present - Present tanpa reason
    const presentRecords = attendanceRecords.filter((r) => r.status === "present" && !r.reason);
    if (presentRecords.length > 0) {
      statusSummary.push({
        status: "present",
        count: presentRecords.length,
        records: convertRecordsToIndonesiaTime(
          presentRecords.map((r) => ({
            date: r.createdAt,
            attendanceStatus: r.status,
          })),
        ),
      });
    }

    // Sick
    const sickRecords = attendanceRecords.filter((r) => r.status === "sick");
    if (sickRecords.length > 0) {
      statusSummary.push({
        status: "sick",
        count: sickRecords.length,
        records: convertRecordsToIndonesiaTime(
          sickRecords.map((r) => ({
            date: r.createdAt,
            reason: r.reason || null,
            attendanceStatus: r.status,
            approvalStatus: r.approval_status || null,
          })),
        ),
      });
    }

    // Permit/Leave
    const permitRecords = attendanceRecords.filter((r) => r.status === "permit");
    if (permitRecords.length > 0) {
      statusSummary.push({
        status: "permit",
        count: permitRecords.length,
        records: convertRecordsToIndonesiaTime(
          permitRecords.map((r) => ({
            date: r.createdAt,
            reason: r.reason,
            attendanceStatus: r.status,
            approvalStatus: r.approval_status,
          })),
        ),
      });
    }

    // Absent - Jika tidak ada data (sick, permit, present) atau jika sick/permit statusnya rejected
    const rejectedSickPermit = attendanceRecords.filter((r) => (r.status === "sick" || r.status === "permit") && r.approval_status === "rejected");

    // Get date range untuk calculate date yang gk ada
    let startOfPeriod = new Date();
    let endOfPeriod = new Date();

    const today = new Date();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    if (year !== undefined && month !== undefined) {
      startOfPeriod = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endOfPeriod = todayEnd;
    } else if (year !== undefined) {
      startOfPeriod = new Date(year, 0, 1, 0, 0, 0, 0);
      endOfPeriod = todayEnd;
    } else {
      startOfPeriod = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
      endOfPeriod = todayEnd;
    }

    // Collect all dates that have data
    const datesWithData = new Set<string>();
    attendanceRecords.forEach((r) => {
      const dateStr = new Date(r.createdAt ?? new Date()).toISOString().split("T")[0];
      datesWithData.add(dateStr);
    });

    // Find missing dates (no data) - exclude Sundays
    const missingDates: Date[] = [];
    const currentDate = new Date(startOfPeriod);
    while (currentDate <= endOfPeriod) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayOfWeek = currentDate.getDay();

      // Only count Monday-Saturday (0 = Sunday, skip it)
      if (dayOfWeek !== 0 && !datesWithData.has(dateStr)) {
        missingDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const absentRecords: any[] = [];

    // Add rejected sick/permit as absent
    rejectedSickPermit.forEach((r) => {
      absentRecords.push({
        date: r.createdAt,
        reason: `${r.status} (rejected)`,
        attendanceStatus: r.status,
        approvalStatus: r.approval_status || null,
      });
    });

    // Add missing dates as absent
    missingDates.forEach((date) => {
      absentRecords.push({
        date,
        reason: "No data",
        attendanceStatus: "absent",
        approvalStatus: null,
      });
    });

    if (absentRecords.length > 0) {
      statusSummary.push({
        status: "absent",
        count: absentRecords.length,
        records: convertRecordsToIndonesiaTime(absentRecords),
      });
    }

    return {
      userId,
      userName,
      statusSummary,
    };
  },

  getAttendanceDetailSummaryAll: async (year?: number, month?: number): Promise<any> => {
    let attendanceRecords: IAttendance[];

    if (year !== undefined || month !== undefined) {
      attendanceRecords = await attendanceRepository.findAllWithDate({ year, month });
    } else {
      attendanceRecords = await attendanceRepository.findAll({});
    }

    const userGroups = new Map<string, IAttendance[]>();
    attendanceRecords.forEach((record) => {
      const userIdStr = record.userId.toString();
      if (!userGroups.has(userIdStr)) {
        userGroups.set(userIdStr, []);
      }
      userGroups.get(userIdStr)!.push(record);
    });

    const uniqueUserIds = Array.from(userGroups.keys());

    const userMap = new Map();
    for (const userId of uniqueUserIds) {
      try {
        const user = await userRepository.findUserById(userId);
        if (user) {
          userMap.set(userId, user.name);
        }
      } catch (error) {
        userMap.set(userId, "Unknown User");
      }
    }

    const detailSummary = Array.from(userGroups.entries()).map(([userId, records]) => {
      const sickRecords = records.filter((r) => r.status === "sick");
      const permitRecords = records.filter((r) => r.status === "permit");
      const absentRecords = records.filter((r) => r.status === "absent");

      const details: any = {};

      if (sickRecords.length > 0) {
        details.sick = {
          count: sickRecords.length,
          dates: sickRecords.map((r) => dateHelper.formatToIndonesiaTimeISO(r.createdAt!)),
        };
      }

      if (permitRecords.length > 0) {
        details.permit = {
          count: permitRecords.length,
          dates: permitRecords.map((r) => dateHelper.formatToIndonesiaTimeISO(r.createdAt!)),
        };
      }

      if (absentRecords.length > 0) {
        details.absent = {
          count: absentRecords.length,
          dates: absentRecords.map((r) => dateHelper.formatToIndonesiaTimeISO(r.createdAt!)),
        };
      }

      return {
        userId,
        userName: userMap.get(userId),
        details,
      };
    });

    return detailSummary;
  },

  checkOutByMinister: async (targetUserId: Types.ObjectId, reasonCheckOut: string): Promise<IAttendance> => {
    if (!targetUserId) {
      throw new Error("Target user ID is required");
    }

    if (!reasonCheckOut || reasonCheckOut.trim() === "") {
      throw new Error("Reason for checkout is required");
    }

    // Validate checkout time
    await attendanceValidate.checkOutByMinister(targetUserId);

    const startOfDay = dateHelper.getStartOfDayWIB();
    const endOfDay = dateHelper.getEndOfDayWIB();

    const userAttendance = await attendanceRepository.findOne({
      userId: targetUserId,
      checkIn: { $gte: startOfDay, $lt: endOfDay },
    });

    if (!userAttendance) {
      throw new Error("Attendance record not found for this user today");
    }

    if (!userAttendance.checkIn) {
      throw new Error("User has not checked in today");
    }

    if (userAttendance.checkOut != null) {
      throw new Error("User has already checked out");
    }

    userAttendance.checkOut = new Date();
    userAttendance.reasonCheckOut = reasonCheckOut;
    const result = await userAttendance.save();

    // Create operational record
    try {
      await operationalRecordService.createOperationalRecord({
        userId: targetUserId,
        type: ScheduleType.thematic,
        date: new Date(),
      } as any);
    } catch (error) {
      console.log("Operational record creation skipped:", (error as any).message);
      // Jangan throw error jika operational record gagal, tetap return attendance result
    }

    return convertAttendanceToIndonesiaTime(result);
  },

  checkOutAllByMinister: async (reasonCheckOut: string): Promise<{ checkedOut: number }> => {
    if (!reasonCheckOut || reasonCheckOut.trim() === "") {
      throw new Error("Reason for checkout is required");
    }

    await attendanceValidate.checkOutByMinister(new Types.ObjectId());

    const startOfDay = dateHelper.getStartOfDayWIB();
    const endOfDay = dateHelper.getEndOfDayWIB();

    const pending = await attendanceRepository.findAll({
      checkIn: { $gte: startOfDay, $lt: endOfDay } as any,
      checkOut: null as any,
    });

    const toUpdate = pending.filter((a) => a.checkIn && !a.checkOut);

    await Promise.all(
      toUpdate.map(async (a) => {
        a.checkOut = new Date();
        a.reasonCheckOut = reasonCheckOut;
        await a.save();
      })
    );

    return { checkedOut: toUpdate.length };
  },

  submitLeaveByOperational: async (
    operationalUserId: Types.ObjectId,
    userId: Types.ObjectId,
    type: attendanceStatus,
    reason: string,
    start_date: Date,
    end_date: Date,
    attachment_url?: string,
  ): Promise<IAttendance> => {
    if (!operationalUserId) {
      throw new Error("Operational user ID is required");
    }

    if (!userId) {
      throw new Error("Target user ID is required");
    }

    if (!type || !["sick", "permit"].includes(type)) {
      throw new Error("Type must be 'sick' or 'permit'");
    }

    if (!reason || reason.trim() === "") {
      throw new Error("Reason is required");
    }

    if (!start_date || !end_date) {
      throw new Error("Start date and end date are required");
    }

    if (new Date(end_date) < new Date(start_date)) {
      throw new Error("End date must be after start date");
    }

    const record = await attendanceRepository.create({
      userId: userId,
      status: type as attendanceStatus,
      reason: reason,
      attachment_url: attachment_url,
      start_date: start_date,
      end_date: end_date,
      approval_status: approvalStatus.APPROVED,
      approved_by: operationalUserId,
      submitted_by: operationalUserId,
    });

    return convertAttendanceToIndonesiaTime(record);
  },
};

export default attendanceService;