import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import { KPIMaster, KPIDetail } from "./models/kpi/kpi_item/kpi.item.schema";
import { KPILabel } from "./models/kpi/kpi_item/kpi.item.interface";

// The 4 ministries that kpi.count.services.ts matches on by exact
// (case-insensitive) name — nothing else in the scoring logic recognizes
// any other kementerian value. Weight starts at 0; configure it via the
// Points page after seeding. Matches the casing already live in the DB.
const MINISTRIES = ["operational", "research", "branding", "competition"];

// getMyOperationalSummary / getAllOperationalBreakdown (GET /kpi/operational
// and /kpi/operational/me, consumed by the Scoring feature on the frontend)
// look up KPI details under "operational" by these exact lowercase names.
// Without them, the operational breakdown always reports zero even when
// real attendance/picket/thematic activity exists.
//
// "thematic" (generic, single-tier) was replaced by two tiers that
// attendance.service.ts's resolveThematicTierForCheckout looks up by exact
// name: "Thematic Presenter" for users assigned to that day's thematic
// schedule, "Thematic Participant" for everyone else checking out on a day
// that has one.
const OPERATIONAL_DETAILS = ["attendance", "picket", "Thematic Presenter", "Thematic Participant"];

function exactCaseInsensitive(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

async function seedKpiMasters(): Promise<void> {
  for (const kementerian of MINISTRIES) {
    // Case-insensitive match: the DB may already have "Operational",
    // "operational", etc. — never create a second row for the same ministry.
    const existing = await KPIMaster.findOne({ kementerian: exactCaseInsensitive(kementerian) });
    if (existing) {
      console.log(`  = "${existing.kementerian}" already exists, left untouched`);
      continue;
    }
    await KPIMaster.create({ kementerian, point: 0 });
    console.log(`  + created KPI master "${kementerian}"`);
  }
}

async function seedOperationalDetails(): Promise<void> {
  const operationalMaster = await KPIMaster.findOne({ kementerian: exactCaseInsensitive("operational") });
  if (!operationalMaster) {
    console.warn("  ! Operational master not found, skipping operational detail seeding");
    return;
  }

  for (const kpi_item of OPERATIONAL_DETAILS) {
    const existing = await KPIDetail.findOne({
      kpi_item: exactCaseInsensitive(kpi_item),
      id_kpi_master: operationalMaster._id,
    });
    if (existing) {
      console.log(`  = "${existing.kpi_item}" already exists under ${operationalMaster.kementerian}, left untouched`);
      continue;
    }
    await KPIDetail.create({
      kpi_item,
      id_kpi_master: operationalMaster._id,
      point: 0,
      max_activity: 1,
      label: KPILabel.OPTIONAL,
    });
    console.log(`  + created KPI detail "${kpi_item}" under ${operationalMaster.kementerian}`);
  }
}

async function main(): Promise<void> {
  await connectDB();

  console.log("Seeding KPI masters...");
  await seedKpiMasters();

  console.log("Seeding Operational KPI details...");
  await seedOperationalDetails();

  await mongoose.disconnect();
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
