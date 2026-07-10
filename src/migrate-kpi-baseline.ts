import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import userRepository from "./repository/user.repository";
import KPIRepository from "./repository/kpi.respository";
import KPIBaselineRepository from "./repository/kpi.baseline.repository";
import operationalRecordRepository from "./repository/operationalRecord.repository";
import KPICountService from "./services/kpi.count.services";

// One-time migration: freeze every user's current all-time total per
// ministry category into a KPIBaseline document, computed from today's live
// config (there's no historical audit trail, so "current config as of
// migration" is the best available approximation). From then on,
// getMyKPISummary adds this frozen amount on top of whatever activity
// happens *after* the cutoff, so future weight changes only ever affect
// future activity, never what's already been frozen.
//
// Idempotent by design: skips any (user, master) pair that already has a
// baseline, so re-running this script is always safe — it only fills gaps
// (new users, newly-added ministry categories) and never recomputes or
// overwrites an existing baseline.

async function migrateUserCategory(user: any, master: any): Promise<"created" | "skipped"> {
  const existing = await KPIBaselineRepository.findBaseline(user._id.toString(), master._id.toString());
  if (existing) return "skipped";

  const summary = await KPICountService.getMyKPISummary(user._id.toString());
  const categorySummary = summary.categories.find((c: any) => c.kementerian === master.kementerian);
  if (!categorySummary) return "skipped";

  const migratedAt = new Date();
  let cutoffDate = migratedAt;

  // OperationalRecord (picket/thematic) has no createdAt — only a
  // client-supplied schedule `date`, which can already be set to a future
  // day at migration time. Using the latest existing schedule date (if it's
  // later than "now") as the cutoff avoids double-counting an entry that
  // was submitted before migration for a date after it.
  if (master.kementerian.toLowerCase() === "operational") {
    const latest = await operationalRecordRepository.findLatestDateForUser(user._id.toString());
    if (latest && latest.date > cutoffDate) cutoffDate = latest.date;
  }

  await KPIBaselineRepository.createBaseline({
    userId: user._id,
    id_kpi_master: master._id,
    kementerian: master.kementerian,
    baseline_point: categorySummary.total_point,
    migratedAt,
    cutoffDate,
    detailSnapshot: categorySummary.details.map((d: any) => ({
      kpiDetailId: d.kpiDetailId,
      kpi_item: d.kpi_item,
      jumlah_activity: d.jumlah_activity,
      point_akhir: d.point_akhir,
    })),
  });

  return "created";
}

async function main(): Promise<void> {
  await connectDB();

  const users = await userRepository.findAllUsers();
  const masters = await KPIRepository.findAllMasters();

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    for (const master of masters) {
      const result = await migrateUserCategory(user, master);
      if (result === "created") created++;
      else skipped++;
    }
  }

  console.log(`Baseline migration done. Created ${created}, skipped ${skipped} (already existed).`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("Baseline migration failed:", error);
  process.exit(1);
});
