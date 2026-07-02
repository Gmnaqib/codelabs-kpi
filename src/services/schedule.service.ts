import scheduleRepository from "../repository/schedule.repository";
import ISchedule, { ScheduleType } from "../models/schedule/schedule.interface";
import { Types } from "mongoose";

const MAX_PICKET_USERS_PER_DAY = 6;

const rotateRight = <T>(items: T[], shift: number): T[] => {
  const n = items.length;
  if (n === 0) return items;
  const offset = shift % n;
  if (offset === 0) return [...items];
  return [...items.slice(n - offset), ...items.slice(0, n - offset)];
};

const capToActivePicketUsers = (schedule: ISchedule & { toObject: () => any }) => {
  const plain = schedule.toObject();
  return {
    ...plain,
    assignedUsers: (plain.assignedUsers ?? []).slice(0, MAX_PICKET_USERS_PER_DAY),
  };
};

const scheduleService = {
  createSchedule: async (type: ScheduleType, date: Date, assignedUsers?: Types.ObjectId[], description?: string): Promise<ISchedule> => {
    if (!type || !date) {
      throw new Error("Type and date are required");
    }

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new Error("Schedule date must be Monday to Friday only");
    }

    const scheduleData: Partial<ISchedule> = { type, date };
    if (assignedUsers) scheduleData.assignedUsers = assignedUsers;
    if (description) scheduleData.description = description;

    return await scheduleRepository.createSchedule(scheduleData);
  },
  createBatchSchedule: async (params: {
    type: ScheduleType;
    startDate: Date;
    endDate: Date;
    patterns: Array<{
      daysOfWeek: number[];
      assignedUsers: Types.ObjectId[];
      description?: string;
    }>;
  }): Promise<ISchedule[]> => {
    const { type, startDate, endDate, patterns } = params;

    if (!type || !startDate || !endDate || !patterns || patterns.length === 0) {
      throw new Error("Type, startDate, endDate, and patterns are required");
    }

    if (startDate > endDate) {
      throw new Error("startDate must be before endDate");
    }

    for (const pattern of patterns) {
      if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
        throw new Error("Each pattern must have daysOfWeek");
      }
      if (!pattern.assignedUsers || pattern.assignedUsers.length === 0) {
        throw new Error("Each pattern must have at least one assignedUser");
      }

      const invalidDays = pattern.daysOfWeek.filter((day) => day < 1 || day > 5);
      if (invalidDays.length > 0) {
        throw new Error("daysOfWeek must only contain Monday-Friday (1-5)");
      }
    }

    const createdSchedules: ISchedule[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const endDateNormalized = new Date(endDate);
    endDateNormalized.setHours(23, 59, 59, 999);

    // Hitung occurrence per pattern+hari supaya rotasi piket konsisten dan tidak butuh filter manual lagi setelah dibuat
    const occurrenceCount: Record<string, number> = {};

    while (currentDate <= endDateNormalized) {
      const dayOfWeek = currentDate.getDay();

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if (pattern.daysOfWeek.includes(dayOfWeek)) {
          const occurrenceKey = `${i}-${dayOfWeek}`;
          const occurrence = occurrenceCount[occurrenceKey] ?? 0;
          occurrenceCount[occurrenceKey] = occurrence + 1;

          const assignedUsers = type === ScheduleType.picket ? rotateRight(pattern.assignedUsers, occurrence) : pattern.assignedUsers;

          const scheduleData: Partial<ISchedule> = {
            type,
            date: new Date(currentDate),
            assignedUsers,
            description: pattern.description,
          };

          // Hapus schedule lama di tanggal yang sama supaya tidak terjadi data dobel
          await scheduleRepository.deleteSchedulesByTypeAndDate(type, currentDate);

          const createdSchedule = await scheduleRepository.createSchedule(scheduleData);
          createdSchedules.push(createdSchedule);
          break;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return createdSchedules;
  },

  getAllSchedules: async (): Promise<ISchedule[]> => {
    return await scheduleRepository.findAllSchedules();
  },

  getTodayPicketSchedule: async (): Promise<any[]> => {
    const schedules = await scheduleRepository.findSchedulesByTypeAndDate(ScheduleType.picket, new Date());

    // assignedUsers sudah dirotasi saat dibuat (createBatchSchedule), di sini tinggal dipotong maksimal 6 orang
    return schedules.map(capToActivePicketUsers);
  },

  getUpcomingPicketScheduleForSwap: async (): Promise<any[]> => {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 13); // 2 minggu kedepan (hari ini + 13 hari)
    endDate.setHours(23, 59, 59, 999);

    const schedules = await scheduleRepository.findSchedulesByTypeAndDateRange(ScheduleType.picket, startDate, endDate);

    // hanya posisi 1-6 yang ditampilkan sebagai kandidat tukar, karena kapasitas piket per hari cuma 6 orang
    return schedules.map(capToActivePicketUsers);
  },

  getScheduleById: async (id: Types.ObjectId): Promise<ISchedule | null> => {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid schedule ID format");
    }
    return await scheduleRepository.findScheduleById(id);
  },

  getSchedulesByType: async (type: ScheduleType): Promise<ISchedule[]> => {
    if (!Object.values(ScheduleType).includes(type)) {
      throw new Error("Invalid schedule type");
    }
    return await scheduleRepository.findSchedulesByType(type);
  },

  getSchedulesByDate: async (date: Date): Promise<ISchedule[]> => {
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    return await scheduleRepository.findSchedulesByDate(date);
  },

  getSchedulesByTypeAndDate: async (type: ScheduleType, date: Date): Promise<ISchedule[]> => {
    if (!Object.values(ScheduleType).includes(type)) {
      throw new Error("Invalid schedule type");
    }
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    return await scheduleRepository.findSchedulesByTypeAndDate(type, date);
  },

  getSchedulesByDateRange: async (startDate: Date, endDate: Date): Promise<ISchedule[]> => {
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format");
    }
    return await scheduleRepository.findSchedulesByDateRange(startDate, endDate);
  },

  getSchedulesByTypeAndDateRange: async (type: ScheduleType, startDate: Date, endDate: Date): Promise<ISchedule[]> => {
    if (!Object.values(ScheduleType).includes(type)) {
      throw new Error("Invalid schedule type");
    }
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format");
    }
    return await scheduleRepository.findSchedulesByTypeAndDateRange(type, startDate, endDate);
  },

  getSchedulesByEndDate: async (endDate: Date): Promise<ISchedule[]> => {
    if (isNaN(endDate.getTime())) {
      throw new Error("Invalid date format");
    }
    const startDate = new Date();
    return await scheduleRepository.findSchedulesByDateRange(startDate, endDate);
  },

  getSchedulesByTypeAndEndDate: async (type: ScheduleType, endDate: Date): Promise<ISchedule[]> => {
    if (!Object.values(ScheduleType).includes(type)) {
      throw new Error("Invalid schedule type");
    }
    if (isNaN(endDate.getTime())) {
      throw new Error("Invalid date format");
    }
    const startDate = new Date();
    return await scheduleRepository.findSchedulesByTypeAndDateRange(type, startDate, endDate);
  },

  updateSchedule: async (
    id: Types.ObjectId,
    updateData: {
      type?: ScheduleType;
      date?: Date;
      assignedUsers?: Types.ObjectId[];
      description?: string;
    },
  ): Promise<ISchedule | null> => {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid schedule ID format");
    }

    // Validate date is Monday-Friday if date is provided
    if (updateData.date) {
      const dayOfWeek = updateData.date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        throw new Error("Schedule date must be Monday to Friday only");
      }
    }

    const existingSchedule = await scheduleRepository.findScheduleById(id);
    if (!existingSchedule) {
      return null;
    }

    return await scheduleRepository.updateScheduleById(id, updateData);
  },

  partialUpdateSchedule: async (
    id: Types.ObjectId,
    updateData: {
      type?: ScheduleType;
      date?: Date;
      assignedUsers?: Types.ObjectId[];
      description?: string;
    },
  ): Promise<ISchedule | null> => {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid schedule ID format");
    }

    // Validate date is Monday-Friday if date is provided
    if (updateData.date) {
      const dayOfWeek = updateData.date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        throw new Error("Schedule date must be Monday to Friday only");
      }
    }

    const existingSchedule = await scheduleRepository.findScheduleById(id);
    if (!existingSchedule) {
      return null;
    }

    return await scheduleRepository.updateScheduleById(id, updateData);
  },

  deleteSchedule: async (id: Types.ObjectId): Promise<ISchedule | null> => {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid schedule ID format");
    }

    return await scheduleRepository.deleteScheduleById(id);
  },

  swapUsers: async (
    schedule1Id: Types.ObjectId,
    schedule1UserId: Types.ObjectId,
    schedule2Id: Types.ObjectId,
    schedule2UserId: Types.ObjectId,
  ): Promise<{ schedule1: ISchedule | null; schedule2: ISchedule | null }> => {
    if (!Types.ObjectId.isValid(schedule1Id) || !Types.ObjectId.isValid(schedule1UserId) || !Types.ObjectId.isValid(schedule2Id) || !Types.ObjectId.isValid(schedule2UserId)) {
      throw new Error("Invalid ObjectId format");
    }

    const schedule1 = await scheduleRepository.findScheduleById(schedule1Id);
    const schedule2 = await scheduleRepository.findScheduleById(schedule2Id);

    if (!schedule1) {
      throw new Error(`Schedule 1 with ID ${schedule1Id} not found`);
    }

    if (!schedule2) {
      throw new Error(`Schedule 2 with ID ${schedule2Id} not found`);
    }

    // Check if user1 exists in schedule1
    const user1ObjectId = new Types.ObjectId(schedule1UserId);
    const user1Exists = schedule1.assignedUsers?.some((userId) => userId.equals(user1ObjectId));

    if (!user1Exists) {
      throw new Error(`User ${schedule1UserId} not found in Schedule 1`);
    }

    // Check if user2 exists in schedule2
    const user2ObjectId = new Types.ObjectId(schedule2UserId);
    const user2Exists = schedule2.assignedUsers?.some((userId) => userId.equals(user2ObjectId));

    if (!user2Exists) {
      throw new Error(`User ${schedule2UserId} not found in Schedule 2`);
    }

    const updatedAssignedUsers1 = schedule1.assignedUsers!.map((userId) => (userId.equals(user1ObjectId) ? user2ObjectId : userId));
    const updatedAssignedUsers2 = schedule2.assignedUsers!.map((userId) => (userId.equals(user2ObjectId) ? user1ObjectId : userId));

    // Update both schedules
    const updatedSchedule1 = await scheduleRepository.updateScheduleById(schedule1Id, {
      assignedUsers: updatedAssignedUsers1,
    });

    const updatedSchedule2 = await scheduleRepository.updateScheduleById(schedule2Id, {
      assignedUsers: updatedAssignedUsers2,
    });

    return {
      schedule1: updatedSchedule1,
      schedule2: updatedSchedule2,
    };
  },
};

export default scheduleService;
