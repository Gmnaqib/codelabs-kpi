import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import Attendance from "./models/attendance/attendance.schema";
import OperationalRecord from "./models/operationalRecord/operational.schema";
import { resolveKpiDetailId } from "./helper/kpi.detail.validator";

// Historical attendance/picket/thematic records can point to id_kpi_detail
// values that are either null OR stale (the detail's parent KPIMaster was
// deleted during a past reset, orphaning the reference — deleting a
// KPIMaster does not cascade-delete its KPIDetail children or un-link
// records that already referenced them). Either way, scoring only counts
// records whose id_kpi_detail matches the *current* "attendance" /
// "picket" / "thematic" detail id under "operational", so both null and
// stale references are invisible to the score. Since every attendance
// record always belongs to the single current "attendance" detail (same
// for picket/thematic), it's safe to unconditionally re-point every
// record — there is no valid reason for one to intentionally point
// elsewhere.

async function backfillAttendance(): Promise<void> {
  const attendanceDetailId = await resolveKpiDetailId("operational", "attendance");
  if (!attendanceDetailId) {
    console.warn('  ! No "attendance" KPI detail found under "operational" — skipping attendance backfill');
    return;
  }

  const result = await Attendance.updateMany(
    { id_kpi_detail: { $ne: attendanceDetailId } },
    { $set: { id_kpi_detail: attendanceDetailId } }
  );
  console.log(`  Re-linked ${result.modifiedCount} attendance record(s) to the current "attendance" KPI detail.`);
}

async function backfillOperationalRecords(type: "picket" | "thematic"): Promise<void> {
  const detailId = await resolveKpiDetailId("operational", type);
  if (!detailId) {
    console.warn(`  ! No "${type}" KPI detail found under "operational" — skipping ${type} backfill`);
    return;
  }

  const result = await OperationalRecord.updateMany(
    { type, id_kpi_detail: { $ne: detailId } },
    { $set: { id_kpi_detail: detailId } }
  );
  console.log(`  Re-linked ${result.modifiedCount} ${type} record(s) to the current "${type}" KPI detail.`);
}

async function main(): Promise<void> {
  await connectDB();

  console.log("Backfilling attendance records...");
  await backfillAttendance();

  console.log("Backfilling operational records (picket/thematic)...");
  await backfillOperationalRecords("picket");
  await backfillOperationalRecords("thematic");

  await mongoose.disconnect();
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
