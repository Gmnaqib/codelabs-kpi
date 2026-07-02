import TimeSetting from "../models/timeSetting/timeSetting.schema";
import ITimeSetting from "../models/timeSetting/timeSetting.interface";

const timeSettingRepository = {
  create:      (data: Partial<ITimeSetting>) => TimeSetting.create(data),
  findAll:     () => TimeSetting.find(),
  findById:    (id: string) => TimeSetting.findById(id),
  findByCode:  (code: string) => TimeSetting.findOne({ code: code.toUpperCase() }),
  updateById:  (id: string, data: Partial<ITimeSetting>) => TimeSetting.findByIdAndUpdate(id, data, { new: true }),
  deleteById:  (id: string) => TimeSetting.findByIdAndDelete(id),
};

export default timeSettingRepository;
