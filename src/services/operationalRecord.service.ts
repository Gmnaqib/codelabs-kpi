import IOperationalRecord from "../models/operationalRecord/operational.interface";
import operationalRepository from "../repository/operationalRecord.repository";
import scheduleRepository from "../repository/schedule.repository";
import { validateKpiDetailKementerian, resolveKpiDetailId } from "../helper/kpi.detail.validator";
import { ScheduleType } from "../models/schedule/schedule.interface";

const operationalRecordService = {
  createOperationalRecord: async (recordData: IOperationalRecord): Promise<IOperationalRecord> => {
    if (recordData.id_kpi_detail) {
      await validateKpiDetailKementerian(recordData.id_kpi_detail.toString(), "operational");
    } else {
      // FE belum pernah mengirim id_kpi_detail saat checkin picket/thematic, jadi dicocokkan otomatis dari kpi_item yang namanya sama dengan type
      const resolvedId = await resolveKpiDetailId("operational", recordData.type);
      if (resolvedId) recordData.id_kpi_detail = resolvedId;
    }

    const scheduleId = recordData.scheduleId;
    const userId = recordData.userId;

    if (scheduleId) {
      const existingRecord = await operationalRepository.findDuplicateRecord(scheduleId, userId);
      const findScheduleById = await scheduleRepository.findScheduleById(scheduleId);

      if (!findScheduleById) throw new Error("Schedule not found");

      const isUserAssignedToSchedule = findScheduleById.assignedUsers?.some(
        (user: any) => user._id.toString() === recordData.userId.toString()
      );

      if (!isUserAssignedToSchedule) throw new Error("User is not assigned to this schedule");
      if (existingRecord) throw new Error("Operational record already exists for this schedule and user");
    }

    return await operationalRepository.createRecord(recordData);
  },

  getAllOperationalRecords: async (filters?: {
    scheduleId?: string;
    userId?: string;
    type?: ScheduleType;
    startDate?: Date;
    endDate?: Date;
    date?: Date;
    status?: string;
  }): Promise<IOperationalRecord[]> => {
    return await operationalRepository.findRecordsWithFilters(filters || {});
  },

  getOperationalRecordById: async (recordId: string): Promise<IOperationalRecord | null> => {
    return await operationalRepository.findRecordById(recordId);
  },

  getOperationalRecordsByScheduleId: async (scheduleId: string): Promise<IOperationalRecord[]> => {
    return await operationalRepository.findRecordsByScheduleId(scheduleId);
  },

  getOperationalRecordsByUserId: async (userId: string): Promise<IOperationalRecord[]> => {
    return await operationalRepository.findRecordsByUserId(userId);
  },

  getOperationalRecordsByType: async (type: ScheduleType): Promise<IOperationalRecord[]> => {
    return await operationalRepository.findRecordsByType(type);
  },

  getOperationalRecordsByDate: async (date: Date): Promise<IOperationalRecord[]> => {
    return await operationalRepository.findRecordsByDate(date);
  },

  getOperationalRecordsByDateRange: async (startDate: Date, endDate: Date): Promise<IOperationalRecord[]> => {
    return await operationalRepository.findRecordsByDateRange(startDate, endDate);
  },

  getOperationalRecordsByStatus: async (status: string): Promise<IOperationalRecord[]> => {
    return await operationalRepository.findRecordsByStatus(status);
  },

  deleteOperationalRecord: async (recordId: string): Promise<IOperationalRecord | null> => {
    return await operationalRepository.deleteRecordById(recordId);
  },

  getOperationalRecordsCount: async (filters?: { scheduleId?: string; userId?: string; type?: ScheduleType; startDate?: Date; endDate?: Date; date?: Date; status?: string }): Promise<number> => {
    return operationalRepository.countRecordsWithFilters(filters || {});
  },

  checkOperationalRecordExists: async (scheduleId: string, userId: string): Promise<boolean> => {
    const exists = await operationalRepository.recordExists(scheduleId, userId);
    return !!exists;
  },
};

export default operationalRecordService;