import mongoose, { Schema } from "mongoose";
import ITimeSetting from "./timeSetting.interface";

const TimeSettingSchema = new Schema<ITimeSetting>(
  {
    code:             { type: String, required: true, unique: true, uppercase: true, trim: true },
    checkin:          { type: String, required: true },
    checkinlimit:     { type: String, required: true },
    checkinlatelimit: { type: String, required: true },
    checkout:         { type: String, required: true },
    checkoutlate:     { type: String, required: true },
  },
  { timestamps: true }
);

const TimeSetting = mongoose.model<ITimeSetting>("TimeSetting", TimeSettingSchema);
export default TimeSetting;
