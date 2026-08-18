import { ScheduleType } from "../schedule/schedule.interface";
import { Types } from "mongoose";
import { IKPISnapshot } from "../kpi/kpi_snapshot.interface";

interface IOperationalRecord {
  scheduleId?: Types.ObjectId;
  userId: Types.ObjectId;
  id_kpi_detail: Types.ObjectId;
  type: ScheduleType;
  date: Date;
  earned_point?: number
  kpi_snapshot?: IKPISnapshot;
}

export default IOperationalRecord;