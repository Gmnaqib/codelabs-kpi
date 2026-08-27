import SPSetting from "../models/spSetting/spSetting.schema";
import ISPSetting from "../models/spSetting/spSetting.interface";

const spSettingRepository = {
  create: (data: Partial<ISPSetting>) => SPSetting.create(data),
  // Sorted ascending by point so the first entry a grand_total doesn't
  // exceed is the correct (smallest matching) threshold.
  findAll: () => SPSetting.find().sort({ point: 1 }),
  findById: (id: string) => SPSetting.findById(id),
  updateById: (id: string, data: Partial<ISPSetting>) => SPSetting.findByIdAndUpdate(id, data, { new: true }),
  deleteById: (id: string) => SPSetting.findByIdAndDelete(id),
};

export default spSettingRepository;
