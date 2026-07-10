import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import KPICountService from "./services/kpi.count.services";

// Read-only sanity check — prints one user's live KPI summary. Used to
// snapshot values before/after the baseline migration to confirm nothing
// changes as a side effect of deploying the code (before the migration
// script actually runs and creates baseline docs).
const USER_ID = process.argv[2];

async function main(): Promise<void> {
  if (!USER_ID) {
    console.error("Usage: npx ts-node src/check-kpi-summary.ts <userId>");
    process.exit(1);
  }

  await connectDB();
  const summary = await KPICountService.getMyKPISummary(USER_ID);
  console.log(JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("Check failed:", error);
  process.exit(1);
});
