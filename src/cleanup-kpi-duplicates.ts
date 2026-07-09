import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import { KPIMaster, KPIDetail } from "./models/kpi/kpi_item/kpi.item.schema";

// One-off fix for a case-sensitivity bug in the original seed.ts: it created
// duplicate Capitalized KPIMaster rows ("Operational", "Research", "Branding",
// "Competition") alongside the real lowercase rows that already had weights
// configured. This moves any KPIDetail rows that got attached to the
// duplicate "Operational" over to the real "operational" master, then
// deletes the 4 duplicate rows (matched by exact capitalized name AND
// point: 0, so a legitimately-weighted row is never touched).
const DUPLICATE_NAMES = ["Operational", "Research", "Branding", "Competition"];

async function main(): Promise<void> {
  await connectDB();

  const realOperational = await KPIMaster.findOne({ kementerian: "operational" });
  const duplicateOperational = await KPIMaster.findOne({ kementerian: "Operational" });

  if (realOperational && duplicateOperational) {
    const moved = await KPIDetail.updateMany(
      { id_kpi_master: duplicateOperational._id },
      { $set: { id_kpi_master: realOperational._id } }
    );
    console.log(`Moved ${moved.modifiedCount} KPI detail(s) from duplicate "Operational" to real "operational".`);
  } else {
    console.log("No duplicate Operational master found (or real one missing) — nothing to move.");
  }

  for (const name of DUPLICATE_NAMES) {
    const result = await KPIMaster.deleteOne({ kementerian: name, point: 0 });
    if (result.deletedCount > 0) {
      console.log(`Deleted duplicate KPI master "${name}"`);
    } else {
      console.log(`No duplicate found for "${name}" (nothing deleted)`);
    }
  }

  await mongoose.disconnect();
  console.log("Cleanup done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
