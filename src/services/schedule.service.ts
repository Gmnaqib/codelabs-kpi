import scheduleRepository from "../repository/schedule.repository";
import ISchedule, { ScheduleType } from "../models/schedule/schedule.interface";
import { Types } from "mongoose";
import dateHelper from "../helper/dateHelper";

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

const toPlainSchedule = (schedule: ISchedule & { toObject: () => any }) => schedule.toObject();

const scheduleService = {
  createSchedule: async (type: ScheduleType, date: Date, assignedUsers?: Types.ObjectId[], description?: string): Promise<ISchedule> => {
    if (!type || !date) {
      throw new Error("Type and date are required");
    }

    const dayOfWeek = dateHelper.getDayOfWeekWIB(date);
    if (dayOfWeek === 0) {
      throw new Error("Schedule date must be Monday to Saturday only");
    }
    if (type === ScheduleType.picket && dayOfWeek === 6) {
      throw new Error("Picket schedule date must be Monday to Friday only");
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
    // Computed in WIB explicitly (not the server process's local timezone) —
    // otherwise a server ever deployed with a timezone behind UTC would
    // silently shift every generated schedule back by a day.
    const currentDate = dateHelper.getStartOfDayWIB(startDate);
    const endDateNormalized = dateHelper.getEndOfDayWIB(endDate);

    // Hitung occurrence per pattern+hari supaya rotasi piket konsisten dan tidak butuh filter manual lagi setelah dibuat
    const occurrenceCount: Record<string, number> = {};

    while (currentDate <= endDateNormalized) {
      const dayOfWeek = dateHelper.getDayOfWeekWIB(currentDate);

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

          // Update the existing schedule for this day in place instead of
          // delete+recreate — keeps its _id stable so OperationalRecord
          // entries already pointing at it (e.g. a completed picket
          // checkmark) don't get orphaned by a resubmit.
          const savedSchedule = await scheduleRepository.upsertScheduleByTypeAndDate(type, currentDate, scheduleData);
          createdSchedules.push(savedSchedule);
          break;
        }
      }

      // +24h instead of setDate(getDate() + 1) — Indonesia has no DST, so a
      // fixed 24h step always lands on the next WIB calendar day regardless
      // of the server process's own local timezone.
      currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    return createdSchedules;
  },

  // Thematic doesn't repeat weekly like picket — each entry is a specific,
  // one-off date with its own team, no day-of-week expansion/rotation at all.
  createThematicScheduleBatch: async (
    entries: Array<{ date: Date; assignedUsers: Types.ObjectId[]; description?: string }>
  ): Promise<ISchedule[]> => {
    if (!entries || entries.length === 0) {
      throw new Error("At least one schedule entry is required");
    }

    const createdSchedules: ISchedule[] = [];

    for (const entry of entries) {
      if (!entry.date || isNaN(entry.date.getTime())) {
        throw new Error("Each entry must have a valid date");
      }
      if (!entry.assignedUsers || entry.assignedUsers.length === 0) {
        throw new Error("Each entry must have at least one assignedUser");
      }

      // Monday-Saturday only; Sunday is never a valid schedule day.
      const dayOfWeek = dateHelper.getDayOfWeekWIB(entry.date);
      if (dayOfWeek === 0) {
        throw new Error("Thematic schedule date must be Monday to Saturday only");
      }

      // Update the existing thematic schedule for this date in place instead
      // of delete+recreate — keeps its _id stable so any OperationalRecord
      // already pointing at it doesn't get orphaned by a resubmit.
      const created = await scheduleRepository.upsertScheduleByTypeAndDate(ScheduleType.thematic, entry.date, {
        type: ScheduleType.thematic,
        date: entry.date,
        assignedUsers: entry.assignedUsers,
        description: entry.description,
      });
      createdSchedules.push(created);
    }

    return createdSchedules;
  },

  getAllSchedules: async (): Promise<ISchedule[]> => {
    return await scheduleRepository.findAllSchedules();
  },

  // `date` defaults to today, but the caller (e.g. the Schedule page's date
  // filter) can pass any day to look up that day's picket team instead.
  getTodayPicketSchedule: async (date: Date = new Date()): Promise<any[]> => {
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    const schedules = await scheduleRepository.findSchedulesByTypeAndDate(ScheduleType.picket, date);

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

  // Adds member(s) to a specific day's picket team — for a day whose
  // (unrotated) team is still under the cap. Creates the day's schedule if
  // one doesn't exist yet. Unlike createBatchSchedule, this never rotates or
  // touches any other day.
  addUsersToPicketSchedule: async (date: Date, userIds: Types.ObjectId[]): Promise<ISchedule> => {
    if (!date || isNaN(date.getTime())) {
      throw new Error("A valid date is required");
    }
    if (!userIds || userIds.length === 0) {
      throw new Error("At least one userId is required");
    }

    const dayOfWeek = dateHelper.getDayOfWeekWIB(date);
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new Error("Picket schedule date must be Monday to Friday only");
    }

    const [existing] = await scheduleRepository.findSchedulesByTypeAndDate(ScheduleType.picket, date);
    const existingIds = new Set((existing?.assignedUsers ?? []).map((u: any) => String(u?._id ?? u)));
    const newIds = userIds.filter((id) => !existingIds.has(String(id)));

    if (newIds.length === 0) {
      throw new Error("These member(s) are already on this day's picket team");
    }

    if (existingIds.size + newIds.length > MAX_PICKET_USERS_PER_DAY) {
      throw new Error(
        `Adding ${newIds.length} member(s) would exceed the ${MAX_PICKET_USERS_PER_DAY}-person limit for this day (currently ${existingIds.size}).`
      );
    }

    const updated = await scheduleRepository.addUsersToPicketScheduleByDate(date, newIds);
    if (!updated) {
      throw new Error("Failed to add members to the picket schedule");
    }
    return updated;
  },

  // `date` defaults to today, same as getTodayPicketSchedule above.
  getTodayThematicSchedule: async (date: Date = new Date()): Promise<any[]> => {
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    const schedules = await scheduleRepository.findSchedulesByTypeAndDate(ScheduleType.thematic, date);
    return schedules.map(toPlainSchedule);
  },

  getUpcomingThematicScheduleForSwap: async (): Promise<any[]> => {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 13); // 2 minggu kedepan (hari ini + 13 hari)
    endDate.setHours(23, 59, 59, 999);

    const schedules = await scheduleRepository.findSchedulesByTypeAndDateRange(ScheduleType.thematic, startDate, endDate);
    return schedules.map(toPlainSchedule);
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
      const dayOfWeek = dateHelper.getDayOfWeekWIB(updateData.date);
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
      const dayOfWeek = dateHelper.getDayOfWeekWIB(updateData.date);
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

  // Swaps the ENTIRE assignedUsers list between two schedules (e.g. swapping
  // the whole Monday thematic team with the whole Wednesday team), as
  // opposed to swapUsers above which only swaps one specific person each.
  swapGroups: async (
    schedule1Id: Types.ObjectId,
    schedule2Id: Types.ObjectId,
  ): Promise<{ schedule1: ISchedule | null; schedule2: ISchedule | null }> => {
    if (!Types.ObjectId.isValid(schedule1Id) || !Types.ObjectId.isValid(schedule2Id)) {
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

    const assignedUsers1 = schedule1.assignedUsers ?? [];
    const assignedUsers2 = schedule2.assignedUsers ?? [];

    const updatedSchedule1 = await scheduleRepository.updateScheduleById(schedule1Id, {
      assignedUsers: assignedUsers2,
    });

    const updatedSchedule2 = await scheduleRepository.updateScheduleById(schedule2Id, {
      assignedUsers: assignedUsers1,
    });

    return {
      schedule1: updatedSchedule1,
      schedule2: updatedSchedule2,
    };
  },
};

export default scheduleService;
