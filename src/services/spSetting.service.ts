import spSettingRepository from "../repository/spSetting.repository";
import ISPSetting from "../models/spSetting/spSetting.interface";

const spSettingService = {
  create: async (data: Partial<ISPSetting>) => spSettingRepository.create(data),

  findAll: () => spSettingRepository.findAll(),

  findById: async (id: string) => {
    const setting = await spSettingRepository.findById(id);
    if (!setting) throw new Error("SP setting not found");
    return setting;
  },

  updateById: async (id: string, data: Partial<ISPSetting>) => {
    const updated = await spSettingRepository.updateById(id, data);
    if (!updated) throw new Error("SP setting not found");
    return updated;
  },

  deleteById: async (id: string) => {
    const deleted = await spSettingRepository.deleteById(id);
    if (!deleted) throw new Error("SP setting not found");
    return deleted;
  },

  // Finds the smallest configured threshold that grandTotal still falls
  // under. Both the label ("SP 1", ...) and the threshold itself are fully
  // admin-configurable via the CRUD endpoints above, not hardcoded.
  resolveStatus: async (grandTotal: number): Promise<{ sp: string | null; grand_total: number }> => {
    const settings = await spSettingRepository.findAll();
    const matched = settings.find((s) => grandTotal <= s.point);
    return {
      sp: matched ? matched.name : null,
      grand_total: grandTotal,
    };
  },
};

export default spSettingService;
