// Throwaway manual test — NOT part of the app, deleted after use.
// Runs the REAL KPICountService.getMyKPISummary against an isolated
// in-memory MongoDB (mongodb-memory-server), so nothing touches the real
// deployed database. Reproduces the user's exact scenario: a user with
// max_activity=24 who already maxed out one month (24 check-ins), then
// checks if a NEW month's check-in(s) correctly add points again.

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "./models/user/user.schema";
import { KPIMaster, KPIDetail } from "./models/kpi/kpi_item/kpi.item.schema";
import Attendance from "./models/attendance/attendance.schema";
import { attendanceStatus } from "./models/attendance/attendance.Interface";
import { KPILabel } from "./models/kpi/kpi_item/kpi.item.interface";
import KPICountService from "./services/kpi.count.services";

async function main() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const user = await User.create({
    nim: "test-manual-001",
    name: "Test User",
    email: "test-manual-001@example.com",
    password: "x",
    majors: "IT",
    years: "2023",
  });

  const master = await KPIMaster.create({ kementerian: "operational", point: 100 });
  const detail = await KPIDetail.create({
    kpi_item: "attendance",
    point: 24,
    id_kpi_master: master._id,
    label: KPILabel.REQUIRED,
    max_activity: 24,
  });
  const pointPerActivity = detail.point / detail.max_activity;

  function makeAttendance(year: number, month: number, day: number) {
    const ts = new Date(year, month - 1, day, 8);
    return Attendance.create({
      userId: user._id,
      id_kpi_detail: detail._id,
      status: attendanceStatus.PRESENT,
      checkIn: ts,
      checkOut: new Date(year, month - 1, day, 17),
      earned_point: pointPerActivity,
      createdAt: ts,
    });
  }

  function extractAttendanceDetail(summary: any) {
    const op = summary.categories.find((c: any) => c.kementerian?.toLowerCase() === "operational");
    return op?.details.find((d: any) => d.kpi_item === "attendance");
  }

  console.log(`Config: point=${detail.point}, max_activity=${detail.max_activity}, pointPerActivity=${pointPerActivity}\n`);

  // September: exactly 24 check-ins (maxes out max_activity for that month).
  for (let d = 1; d <= 24; d++) {
    await makeAttendance(2026, 9, d);
  }
  const sept = await KPICountService.getMyKPISummary(user._id.toString(), { year: 2026, month: 9 });
  console.log("=== September (24 check-ins THIS month) ===");
  console.log(extractAttendanceDetail(sept));

  // October: 1 new check-in, requested the way the real frontend does (with year+month).
  await makeAttendance(2026, 10, 1);
  const octMonthly = await KPICountService.getMyKPISummary(user._id.toString(), { year: 2026, month: 10 });
  console.log("\n=== October (1 check-in THIS month, WITH monthly dateFilter — how the real app calls it) ===");
  console.log(extractAttendanceDetail(octMonthly));

  // October: same data, but called WITHOUT a dateFilter (simulates the "year missing" bug path).
  const octLifetime = await KPICountService.getMyKPISummary(user._id.toString());
  console.log("\n=== October (same data, WITHOUT dateFilter — the 'year missing' bug path) ===");
  console.log(extractAttendanceDetail(octLifetime));

  // A few more October check-ins, monthly view — should keep climbing from 1 toward the 24 cap.
  await makeAttendance(2026, 10, 2);
  await makeAttendance(2026, 10, 3);
  await makeAttendance(2026, 10, 8);
  const octMonthlyAfterMore = await KPICountService.getMyKPISummary(user._id.toString(), { year: 2026, month: 10 });
  console.log("\n=== October (4 check-ins THIS month by day 8, WITH monthly dateFilter) ===");
  console.log(extractAttendanceDetail(octMonthlyAfterMore));

  await mongoose.disconnect();
  await mongod.stop();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
