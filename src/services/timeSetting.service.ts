import timeSettingRepository from "../repository/timeSetting.repository";
import ITimeSetting from "../models/timeSetting/timeSetting.interface";

// Fallback default jika belum ada setting di DB
export const DEFAULT_TIME_SETTINGS: Record<string, ITimeSetting> = {
  WEEKDAY: {
    code: "WEEKDAY",
    checkin: "06:00",
    checkinlimit: "09:00",
    checkinlatelimit: "10:00",
    checkout: "17:00",
    checkoutlate: "19:00",
  },
  SATURDAY: {
    code: "SATURDAY",
    checkin: "06:00",
    checkinlimit: "09:00",
    checkinlatelimit: "10:00",
    checkout: "13:00",
    checkoutlate: "23:59",
  },
};

const timeSettingService = {
  create: async (data: Partial<ITimeSetting>) => {
    const existing = await timeSettingRepository.findByCode(data.code!);
    if (existing) throw new Error(`Time setting with code "${data.code}" already exists`);
    return timeSettingRepository.create(data);
  },

  findAll: () => timeSettingRepository.findAll(),

  findById: async (id: string) => {
    const setting = await timeSettingRepository.findById(id);
    if (!setting) throw new Error("Time setting not found");
    return setting;
  },

  findByCode: async (code: string): Promise<ITimeSetting> => {
    const setting = await timeSettingRepository.findByCode(code);
    return setting ?? DEFAULT_TIME_SETTINGS[code.toUpperCase()] ?? DEFAULT_TIME_SETTINGS["WEEKDAY"];
  },

  updateById: async (id: string, data: Partial<ITimeSetting>) => {
    const updated = await timeSettingRepository.updateById(id, data);
    if (!updated) throw new Error("Time setting not found");
    return updated;
  },

  deleteById: async (id: string) => {
    const deleted = await timeSettingRepository.deleteById(id);
    if (!deleted) throw new Error("Time setting not found");
    return deleted;
  },
};

export default timeSettingService;
