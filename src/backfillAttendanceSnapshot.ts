import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import Attendance from "./models/attendance/attendance.schema";
import { attendanceStatus } from "./models/attendance/attendance.Interface";
import { KPIDetail } from "./models/kpi/kpi_item/kpi.item.schema";
import KPISnapshotHelper from "./helper/kpiSnapshotHelper";
import { resolveKpiDetailId } from "./helper/kpi.detail.validator";

// One-off backfill: locks in TODAY's KPI point value onto every existing
// PRESENT attendance record that doesn't have a kpi_snapshot yet, mirroring
// what attendance.service.ts's resolveAttendanceSnapshot now does for new
// check-ins. Run this BEFORE changing the "attendance" KPI item's point on
// the Points page, so past check-ins keep being worth what they were worth
// when the user actually checked in instead of jumping to the new value.
//
// Safe to re-run: a record that already has a kpi_snapshot is left
// untouched, so running it again after changing the point does nothing to
// records already backfilled (it will, however, freeze any *new* PRESENT
// records created since the last run — same as intended).
async function main(): Promise<void> {
  await connectDB();

  const fallbackDetailId = await resolveKpiDetailId("operational", "attendance");

  const records = await Attendance.find({
    status: attendanceStatus.PRESENT,
    kpi_snapshot: null,
  });

  console.log(`Found ${records.length} PRESENT record(s) without a kpi_snapshot.`);

  const detailCache = new Map<string, Awaited<ReturnType<typeof KPIDetail.findById>>>();
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const detailId = record.id_kpi_detail ?? fallbackDetailId;
    if (!detailId) {
      skipped++;
      continue;
    }

    const key = detailId.toString();
    if (!detailCache.has(key)) {
      detailCache.set(key, await KPIDetail.findById(detailId));
    }
    const kpiDetail = detailCache.get(key);
    if (!kpiDetail) {
      skipped++;
      continue;
    }

    const snapshot = KPISnapshotHelper.createSnapshot(kpiDetail as any);
    record.kpi_snapshot = snapshot;
    record.earned_point = KPISnapshotHelper.calculateNormalPoint(snapshot);
    if (!record.id_kpi_detail) record.id_kpi_detail = detailId;
    await record.save();
    updated++;
  }

  console.log(`Updated ${updated} record(s). Skipped ${skipped} record(s) (no matching KPI detail found).`);

  await mongoose.disconnect();
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
