import mongoose, { Schema } from "mongoose";
import ISPSetting from "./spSetting.interface";

const SPSettingSchema = new Schema<ISPSetting>(
  {
    name:  { type: String, required: true, trim: true },
    point: { type: Number, required: true },
  },
  { timestamps: true }
);

const SPSetting = mongoose.model<ISPSetting>("SPSetting", SPSettingSchema);
export default SPSetting;
