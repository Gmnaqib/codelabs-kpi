import { Request, Response } from "express";
import response from "../helper/response";
import { AuthRequest } from "../middlewares/auth.middlewares";
import scheduleService from "../services/schedule.service";
import { ScheduleType } from "../models/schedule/schedule.interface";
import { Types } from "mongoose";

const scheduleController = {
  createSchedule: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { type, date, assignedUsers, description } = req.body;
      const schedule = await scheduleService.createSchedule(type, date, assignedUsers, description);
      return response({ res, code: 201, message: "Schedule created successfully", data: schedule });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  createBatchSchedule: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { type, startDate, endDate, patterns } = req.body;

      if (!type || !startDate || !endDate || !patterns) {
        return response({ res, code: 400, message: "Type, startDate, endDate, and patterns are required" });
      }

      if (!Array.isArray(patterns) || patterns.length === 0) {
        return response({ res, code: 400, message: "Patterns must be a non-empty array" });
      }

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if (!pattern.daysOfWeek || !Array.isArray(pattern.daysOfWeek) || pattern.daysOfWeek.length === 0) {
          return response({ res, code: 400, message: `Pattern ${i} must have daysOfWeek array` });
        }
        if (!pattern.assignedUsers || !Array.isArray(pattern.assignedUsers) || pattern.assignedUsers.length === 0) {
          return response({ res, code: 400, message: `Pattern ${i} must have at least one assignedUser` });
        }
        // Validate assignedUsers are valid ObjectIds
        for (const userId of pattern.assignedUsers) {
          if (!Types.ObjectId.isValid(userId)) {
            return response({ res, code: 400, message: `Invalid userId format in pattern ${i}` });
          }
        }
      }

      const schedules = await scheduleService.createBatchSchedule({
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        patterns: patterns.map((p: any) => ({
          daysOfWeek: p.daysOfWeek,
          assignedUsers: p.assignedUsers.map((id: string) => new Types.ObjectId(id)),
          description: p.description,
        })),
      });

      return response({ res, code: 201, message: `${schedules.length} schedules created successfully`, data: schedules });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  getTodayPicketSchedule: async (req: Request, res: Response): Promise<any> => {
    try {
      const schedules = await scheduleService.getTodayPicketSchedule();
      return response({ res, code: 200, message: "Today's picket schedule retrieved successfully", data: schedules });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getUpcomingPicketScheduleForSwap: async (req: Request, res: Response): Promise<any> => {
    try {
      const schedules = await scheduleService.getUpcomingPicketScheduleForSwap();
      return response({ res, code: 200, message: "Upcoming picket schedules for swap retrieved successfully", data: schedules });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getAllSchedules: async (req: Request, res: Response): Promise<any> => {
    try {
      const { type, year, month, day, date, startDate, endDate } = req.query;
      let schedules;
      let message = "Schedules retrieved successfully";

      if (type && !Object.values(ScheduleType).includes(type as ScheduleType)) {
        return response({ res, code: 400, message: "Invalid schedule type" });
      }

      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return response({ res, code: 400, message: "Invalid date format" });
        }

        if (type) {
          schedules = await scheduleService.getSchedulesByTypeAndEndDate(type as ScheduleType, end);
          message = `${type} schedules for date range retrieved successfully`;
        } else {
          schedules = await scheduleService.getSchedulesByDateRange(start, end);
          message = "Schedules for date range retrieved successfully";
        }
        return response({ res, code: 200, message, data: schedules });
      }

      if (endDate) {
        const end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          return response({ res, code: 400, message: "Invalid endDate format" });
        }

        if (type) {
          schedules = await scheduleService.getSchedulesByTypeAndEndDate(type as ScheduleType, end);
          message = `${type} schedules for date range retrieved successfully`;
        } else {
          schedules = await scheduleService.getSchedulesByEndDate(end);
        }
        return response({ res, code: 200, message, data: schedules });
      }

      if (year && month && day) {
        const yearNum = parseInt(year as string);
        const monthNum = parseInt(month as string) - 1;
        const dayNum = parseInt(day as string);

        if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || monthNum < 0 || monthNum > 11 || dayNum < 1 || dayNum > 31) {
          return response({ res, code: 400, message: "Invalid year, month, or day format" });
        }

        const targetDate = new Date(yearNum, monthNum, dayNum);
        targetDate.setHours(0, 0, 0, 0);

        if (type) {
          schedules = await scheduleService.getSchedulesByTypeAndDate(type as ScheduleType, targetDate);
          message = `${type} schedules for ${yearNum}-${String(monthNum + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")} retrieved successfully`;
        } else {
          schedules = await scheduleService.getSchedulesByDate(targetDate);
          message = `Schedules for ${yearNum}-${String(monthNum + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")} retrieved successfully`;
        }
      } else if (type && date) {
        const targetDate = new Date(date as string);
        if (isNaN(targetDate.getTime())) {
          return response({ res, code: 400, message: "Invalid date format" });
        }
        schedules = await scheduleService.getSchedulesByTypeAndDate(type as ScheduleType, targetDate);
        message = `${type} schedules for date retrieved successfully`;
      } else if (date) {
        const targetDate = new Date(date as string);
        if (isNaN(targetDate.getTime())) {
          return response({ res, code: 400, message: "Invalid date format" });
        }
        schedules = await scheduleService.getSchedulesByDate(targetDate);
        message = "Schedules for date retrieved successfully";
      } else if (type) {
        schedules = await scheduleService.getSchedulesByType(type as ScheduleType);
        message = `${type} schedules retrieved successfully`;
      } else {
        schedules = await scheduleService.getAllSchedules();
        message = "All schedules retrieved successfully";
      }

      return response({ res, code: 200, message, data: schedules });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  getScheduleById: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;

      const schedule = await scheduleService.getScheduleById(new Types.ObjectId(id as string));
      if (!schedule) {
        return response({ res, code: 404, message: "Schedule not found" });
      }

      return response({ res, code: 200, message: "Schedule retrieved successfully", data: schedule });
    } catch (error: any) {
      return response({ res, code: 500, message: error.message });
    }
  },

  updateSchedule: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const { type, date, assignedUsers, description } = req.body;

      const updatedSchedule = await scheduleService.updateSchedule(new Types.ObjectId(id as string), {
        type,
        date,
        assignedUsers,
        description,
      });

      if (!updatedSchedule) {
        return response({ res, code: 404, message: "Schedule not found" });
      }

      return response({ res, code: 200, message: "Schedule updated successfully", data: updatedSchedule });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  partialUpdateSchedule: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const updateFields = req.body;

      const filteredUpdateFields: any = {};

      if (updateFields.type !== undefined) filteredUpdateFields.type = updateFields.type;
      if (updateFields.date !== undefined) filteredUpdateFields.date = updateFields.date;
      if (updateFields.assignedUsers !== undefined) filteredUpdateFields.assignedUsers = updateFields.assignedUsers;
      if (updateFields.description !== undefined) filteredUpdateFields.description = updateFields.description;

      if (Object.keys(filteredUpdateFields).length === 0) {
        return response({ res, code: 400, message: "No valid fields to update" });
      }

      const updatedSchedule = await scheduleService.partialUpdateSchedule(new Types.ObjectId(id as string), filteredUpdateFields);

      if (!updatedSchedule) {
        return response({ res, code: 404, message: "Schedule not found" });
      }

      return response({ res, code: 200, message: "Schedule updated successfully", data: updatedSchedule });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  deleteSchedule: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const deletedSchedule = await scheduleService.deleteSchedule(new Types.ObjectId(id as string));

      if (!deletedSchedule) {
        return response({ res, code: 404, message: "Schedule not found" });
      }

      return response({ res, code: 200, message: "Schedule deleted successfully", data: deletedSchedule });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },

  swapUsers: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { schedule1Id, schedule1UserId, schedule2Id, schedule2UserId } = req.body;

      if (!schedule1Id || !schedule1UserId || !schedule2Id || !schedule2UserId) {
        return response({ res, code: 400, message: "schedule1Id, schedule1UserId, schedule2Id, and schedule2UserId are required" });
      }

      if (!Types.ObjectId.isValid(schedule1Id) || !Types.ObjectId.isValid(schedule1UserId) || !Types.ObjectId.isValid(schedule2Id) || !Types.ObjectId.isValid(schedule2UserId)) {
        return response({ res, code: 400, message: "Invalid ObjectId format" });
      }

      const result = await scheduleService.swapUsers(schedule1Id, schedule1UserId, schedule2Id, schedule2UserId);

      return response({ res, code: 200, message: "Users swapped successfully", data: result });
    } catch (error: any) {
      return response({ res, code: 400, message: error.message });
    }
  },
};

export default scheduleController;
