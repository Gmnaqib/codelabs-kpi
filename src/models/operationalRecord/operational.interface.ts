import { ScheduleType } from "../schedule/schedule.interface";
import { Types } from "mongoose";

interface IOperationalRecord {
  scheduleId?: Types.ObjectId;
  userId: Types.ObjectId;
  id_kpi_detail: Types.ObjectId;
  type: ScheduleType;
  date: Date;
}

export default IOperationalRecord;