import attendanceRepository from "../repository/attendance.repository";
import { attendanceStatus } from "../models/attendance/attendance.Interface";
import userRepository from "../repository/user.repository";
import settingRepository from "../repository/setting.respository";
import mikrotikService from "../services/mikrotik.service";
import timeSettingService from "../services/timeSetting.service";
import dateHelper from "../helper/dateHelper";
import { DateTime } from "luxon";
import { Types } from "mongoose";

const parseTime = (hhmm: string): { hour: number; minute: number } => {
  const [hour, minute] = hhmm.split(":").map(Number);
  return { hour, minute };
};

const getDayCode = (): "WEEKDAY" | "SATURDAY" => {
  const weekday = DateTime.now().setZone("Asia/Jakarta").weekday;
  if (weekday === 6) return "SATURDAY";
  return "WEEKDAY";
};

export const attendanceValidate = {
  checkIn: async (userId: Types.ObjectId, clientIp: string, reason?: string): Promise<{ isLateCheckIn: boolean }> => {
    const now = dateHelper.getNowWIBAsDateTime();
    const startOfDay = dateHelper.getStartOfDayWIB();
    const endOfDay = dateHelper.getEndOfDayWIB();

    const dayCode = getDayCode();
    const setting = await timeSettingService.findByCode(dayCode);

    const { hour: inH, minute: inM } = parseTime(setting.checkin);
    const { hour: limH, minute: limM } = parseTime(setting.checkinlimit);
    const { hour: lateLimH, minute: lateLimM } = parseTime(setting.checkinlatelimit);

    const timeIn = dateHelper.getTimeTodayWIB(inH, inM);
    const timeLimit = dateHelper.getTimeTodayWIB(limH, limM);
    const timeLateLimit = dateHelper.getTimeTodayWIB(lateLimH, lateLimM);

    if (now < timeIn) {
      throw new Error(`You can check in after ${setting.checkin}`);
    }

    if (now > timeLateLimit) {
      throw new Error("It's too late to check in");
    }

    // MikroTik DHCP-based device validation
    const userDevice = await userRepository.findUserMacAddress(userId);

    if (!userDevice?.mac_address) {
      throw new Error("Device not found");
    }

    const isLoopback = clientIp === "127.0.0.1" || clientIp === "::1";
    if (isLoopback) {
      const leases = await mikrotikService.getDhcpLeases();
      const onNetwork = leases.some((lease: any) => {
        const mac = (lease["active-mac-address"] || lease["mac-address"] || "").toUpperCase().replace(/-/g, ":");
        return mac === userDevice.mac_address!.toUpperCase();
      });
      if (!onNetwork) throw new Error("Device not found in MikroTik DHCP lease");
    } else {
      const detectedMac = await mikrotikService.getMacAddressByIp(clientIp);
      if (!detectedMac) throw new Error("Device not found in MikroTik DHCP lease");
      if (detectedMac !== userDevice.mac_address) throw new Error("Device not registered");
    }

    const userAttendance = await attendanceRepository.findOne({
      userId,
      checkIn: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (userAttendance) {
      throw new Error("You have already checked in");
    }

    const isLateCheckIn = now > timeLimit && now < timeLateLimit;
    if (isLateCheckIn && !reason) {
      throw new Error("Reason is required for late check-in");
    }

    return { isLateCheckIn };
  },

  checkOut: async (userId: Types.ObjectId, clientIp: string): Promise<void> => {
    const now = dateHelper.getNowWIBAsDateTime();
    const startOfDay = dateHelper.getStartOfDayWIB();
    const endOfDay = dateHelper.getEndOfDayWIB();

    const dayCode = getDayCode();
    const setting = await timeSettingService.findByCode(dayCode);
    const { hour: outH, minute: outM } = parseTime(setting.checkout);
    const { hour: lateH, minute: lateM } = parseTime(setting.checkoutlate);
    let timeOut = dateHelper.getTimeTodayWIB(outH, outM);
    const timeOutEnd = dateHelper.getTimeTodayWIB(lateH, lateM);

    const isRamadhan = await settingRepository.findSettingByCode("RAMADHAN");
    if (isRamadhan?.value === true) {
      timeOut = dateHelper.getTimeTodayWIB(16);
    }

    // MikroTik DHCP-based device validation
    const userDevice = await userRepository.findUserMacAddress(userId);

    if (!userDevice?.mac_address) {
      throw new Error("Device not found");
    }

    const isLoopbackOut = clientIp === "127.0.0.1" || clientIp === "::1";
    if (isLoopbackOut) {
      const leases = await mikrotikService.getDhcpLeases();
      const onNetwork = leases.some((lease: any) => {
        const mac = (lease["active-mac-address"] || lease["mac-address"] || "").toUpperCase().replace(/-/g, ":");
        return mac === userDevice.mac_address!.toUpperCase();
      });
      if (!onNetwork) throw new Error("Device not found in MikroTik DHCP lease");
    } else {
      const detectedMac = await mikrotikService.getMacAddressByIp(clientIp);
      if (!detectedMac) throw new Error("Device not found in MikroTik DHCP lease");
      if (detectedMac !== userDevice.mac_address) throw new Error("Device not registered");
    }

    const userAttendance = await attendanceRepository.findOne({
      userId,
      checkIn: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (!userAttendance) {
      throw new Error("You not checkin today");
    }

    if (now < timeOut) {
      throw new Error("Too early to check out");
    }

    if (now > timeOutEnd) {
      throw new Error(`Checkout time has passed (allowed until ${setting.checkoutlate})`);
    }
  },

  leaveOrSick: async (userId: Types.ObjectId, status: attendanceStatus, reason: string, attachmentUrl: string, startDate: Date, endDate: Date): Promise<void> => {
    const now = dateHelper.getNowWIBAsDateTime();
    let timeLimit = dateHelper.getTimeTodayWIB(10);
    const userObjectId = new Types.ObjectId(userId);

    if (!status || !reason || !attachmentUrl || !startDate || !endDate) {
      throw new Error("All fields are required");
    }

    if (now > timeLimit) {
      throw new Error("It's too late to submit a leave or sick request today");
    }

    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
      const existingAttendance = await attendanceRepository.findOne({
        userId: userObjectId,
        createdAt: d,
      });

      if (existingAttendance) {
        throw new Error("Anda sudah absen pada tanggal " + d.toISOString().split("T")[0]);
      }
    }
  },

  reviewLeaveRequest: async (requestId: string): Promise<void> => {
    if (!requestId) {
      throw new Error("Request ID is required");
    }

    if (!Types.ObjectId.isValid(requestId)) {
      throw new Error("Invalid request ID format");
    }
  },

  checkOutByMinister: async (targetUserId: Types.ObjectId): Promise<void> => {
    const now = dateHelper.getNowWIBAsDateTime();

    const dayCode = getDayCode();
    const setting = await timeSettingService.findByCode(dayCode);
    const { hour: outH, minute: outM } = parseTime(setting.checkout);
    const { hour: lateH, minute: lateM } = parseTime(setting.checkoutlate);

    let timeOutStart = dateHelper.getTimeTodayWIB(outH, outM);
    const timeOutEnd = dateHelper.getTimeTodayWIB(lateH, lateM);

    const isRamadhan = await settingRepository.findSettingByCode("RAMADHAN");
    if (isRamadhan?.value === true) {
      timeOutStart = dateHelper.getTimeTodayWIB(16);
    }

    if (now < timeOutStart) {
      throw new Error("Too early to check out");
    }

    if (now > timeOutEnd) {
      throw new Error(`Checkout time has passed (allowed until ${setting.checkoutlate})`);
    }
  },
};

export default attendanceValidate;
