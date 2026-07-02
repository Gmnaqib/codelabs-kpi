import { Types } from "mongoose";

interface IAttendance {
  userId: Types.ObjectId;
  id_kpi_detail?: Types.ObjectId;
  status?: attendanceStatus;
  checkIn?: Date;
  checkOut?: Date | null;
  reason?: string;
  reasonCheckOut?: string;
  attachment_url?: string;
  start_date?: Date;
  end_date?: Date;
  approval_status?: approvalStatus;
  approved_by?: Types.ObjectId;
  submitted_by?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum attendanceStatus {
  PRESENT = "present",
  SICK = "sick",
  PERMIT = "permit",
  ABSENT = "absent",
}

export enum approvalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export default IAttendance;