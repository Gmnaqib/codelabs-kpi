import KPIRepository from "../repository/kpi.respository";
import researchRepository from "../repository/research.repository";
import attendanceRepository from "../repository/attendance.repository";
import operationalRecordRepository from "../repository/operationalRecord.repository";
import brandingRepository from "../repository/branding.respository";
import competitionRepository from "../repository/competition.respository";
import userRepository from "../repository/user.repository";
import KPIBaselineRepository from "../repository/kpi.baseline.repository";
import dateHelper from "../helper/dateHelper";
import { attendanceStatus } from "../models/attendance/attendance.Interface";
import { CompetitionStatus } from "../models/competition/competition.interface";
import { ScheduleType } from "../models/schedule/schedule.interface";
import { Types } from "mongoose";

const buildDateFilter = (dateFilter?: { year: number; month?: number }) => {
  if (!dateFilter) return null;
  if (dateFilter.month) {
    return {
      $gte: new Date(dateFilter.year, dateFilter.month - 1, 1),
      $lte: new Date(dateFilter.year, dateFilter.month, 0, 23, 59, 59, 999),
    };
  }
  return {
    $gte: new Date(dateFilter.year, 0, 1),
    $lte: new Date(dateFilter.year, 11, 31, 23, 59, 59, 999),
  };
};

const hitungPoint = (point: number, maxActivity: number, jumlahActivity: number, label: string): number => {
  const pointPerActivity = point / maxActivity;
  const raw = pointPerActivity * jumlahActivity;
  const result = label === "REQUIRED" ? Math.min(raw, point) : raw;
  return Math.floor(result * 10) / 10;
};

const hitungPointRange = (point: number, maxActivity: number, nilaiStatus: number, label: string): number => {
  const pointRangePer1 = point / maxActivity / 5;
  const raw = pointRangePer1 * nilaiStatus;
  const result = label === "REQUIRED" ? Math.min(raw, point) : raw;
  return Math.floor(result * 10) / 10;
};

const KPICountService = {

  getMyKPISummary: async (userId: string, dateFilter?: { year: number; month?: number }) => {
    const userObjectId = new Types.ObjectId(userId);
    const user = await userRepository.findUserById(userId);
    if (!user) throw new Error("User not found");

    const dateRange = buildDateFilter(dateFilter);
    const masters: any[] = await KPIRepository.findAllMasters();
    const categories: any[] = [];

    // A frozen baseline only ever applies to the lifetime/default view (no
    // explicit year/month filter). A scoped monthly view stays fully live,
    // unaffected by any baseline, since folding a per-user constant into a
    // single month would distort month-over-month comparisons.
    const baselines: any[] = dateFilter ? [] : await KPIBaselineRepository.findBaselinesByUserId(userId);
    const baselineByMasterId = new Map(baselines.map((b: any) => [b.id_kpi_master.toString(), b]));

    for (const master of masters) {
      const details: any[] = await KPIRepository.findDetailsByMasterId(master._id.toString());
      const detailResults: any[] = [];
      const baseline = baselineByMasterId.get(master._id.toString());
      const cutoffDate: Date | undefined = baseline?.cutoffDate;

      for (const detail of details) {
        let jumlah_activity = 0;
        let point_akhir = 0;
        const kementerian = master.kementerian.toLowerCase();
        const detailId = detail._id.toString();

        if (kementerian === "operational") {
          const effectiveRange = dateHelper.applyCutoffToRange(dateRange ?? undefined, cutoffDate);
          const attendanceRecords = await attendanceRepository.findAll({
            userId: userObjectId,
            id_kpi_detail: detail._id,
            status: attendanceStatus.PRESENT,
            checkOut: { $ne: null } as any,
            ...(effectiveRange && { createdAt: effectiveRange }),
          });
          const operationalRecords = await operationalRecordRepository.findRecordsWithFilters({
            userId,
            id_kpi_detail: detailId,
            ...(effectiveRange && {
              startDate: effectiveRange.$gte,
              endDate: effectiveRange.$lte,
            }),
          });
          jumlah_activity = attendanceRecords.length + operationalRecords.length;
          point_akhir = hitungPoint(detail.point, detail.max_activity, jumlah_activity, detail.label);

        } else if (kementerian === "research") {
          const records = await researchRepository.findResearchWithFilters({
            userId,
            id_kpi_detail: detailId,
            status: { $ne: null } as any,
            ...(dateFilter && { date: dateFilter }),
            ...(cutoffDate && { cutoffDate }),
          });
          jumlah_activity = records.length;
          const rawTotal = records.reduce((sum: number, r: any) => {
            return sum + hitungPointRange(detail.point, detail.max_activity, r.status || 0, detail.label);
          }, 0);
          point_akhir = Math.floor(rawTotal * 10) / 10;

        } else if (kementerian === "branding") {
          const records = await brandingRepository.findBrandingsByFilter(
            { userId: userObjectId, id_kpi_detail: detail._id, status: { $ne: null } },
            dateFilter ? { year: dateFilter.year, month: dateFilter.month ?? new Date().getMonth() + 1 } : undefined,
            cutoffDate
          );
          jumlah_activity = records.length;
          const rawBranding = records.reduce((sum: number, r: any) => {
            return sum + hitungPointRange(detail.point, detail.max_activity, r.status || 0, detail.label);
          }, 0);
          point_akhir = Math.floor(rawBranding * 10) / 10;

        } else if (kementerian === "competition") {
          const records = await competitionRepository.findCompetitionsByFilter(
            { userId: userObjectId, id_kpi_detail: detail._id, status: CompetitionStatus.Approved },
            dateFilter ? { year: dateFilter.year, month: dateFilter.month ?? new Date().getMonth() + 1 } : undefined,
            cutoffDate
          );
          jumlah_activity = records.length;
          point_akhir = hitungPoint(detail.point, detail.max_activity, jumlah_activity, detail.label);
        }

        // Fold in the frozen baseline for this specific detail, if one
        // exists. Only merge it into a single combined row when the
        // detail's name hasn't changed since it was frozen — if it HAS
        // been renamed, keep the frozen portion as its own separate row
        // under its ORIGINAL name (below) instead of silently relabeling
        // historical activity to whatever the detail is called now.
        // REQUIRED details must never exceed their own weight ceiling
        // after combining historical + fresh activity; OPTIONAL details
        // stay uncapped, matching how a single live calculation already
        // treats them today.
        const frozenDetail = baseline?.detailSnapshot?.find(
          (d: any) => d.kpiDetailId.toString() === detailId
        );
        const wasRenamed = !!frozenDetail && frozenDetail.kpi_item !== detail.kpi_item;
        if (frozenDetail && !wasRenamed) {
          const combined = point_akhir + frozenDetail.point_akhir;
          point_akhir = detail.label === "REQUIRED" ? Math.min(combined, detail.point) : combined;
          point_akhir = Math.floor(point_akhir * 10) / 10;
          jumlah_activity += frozenDetail.jumlah_activity;
        }

        detailResults.push({
          kpiDetailId: detail._id,
          kpi_item: detail.kpi_item,
          label: detail.label,
          point_per_activity: parseFloat(String(Math.floor((detail.point / detail.max_activity) * 10) / 10)),
          jumlah_activity,
          point_akhir,
        });

        if (wasRenamed && frozenDetail) {
          detailResults.push({
            kpiDetailId: frozenDetail.kpiDetailId,
            kpi_item: frozenDetail.kpi_item,
            label: "FROZEN",
            point_per_activity: 0,
            jumlah_activity: frozenDetail.jumlah_activity,
            point_akhir: frozenDetail.point_akhir,
          });
        }
      }

      // A baseline can hold a frozen snapshot for a detail that has since
      // been deleted — it no longer appears in `details` above, so the loop
      // never gets a chance to fold its frozen points back in. Add any such
      // orphaned snapshots straight into this category's results so
      // deleting a detail can never silently drop its historical points.
      // There's no live detail left to re-clamp against, so these are
      // added exactly as they were already (correctly) clamped when frozen.
      if (baseline) {
        const liveDetailIds = new Set(details.map((d: any) => d._id.toString()));
        for (const frozenDetail of baseline.detailSnapshot ?? []) {
          if (!liveDetailIds.has(frozenDetail.kpiDetailId.toString())) {
            detailResults.push({
              kpiDetailId: frozenDetail.kpiDetailId,
              kpi_item: frozenDetail.kpi_item,
              label: "FROZEN",
              point_per_activity: 0,
              jumlah_activity: frozenDetail.jumlah_activity,
              point_akhir: frozenDetail.point_akhir,
            });
          }
        }
      }

      const total_point = parseFloat(
        String(Math.floor(detailResults.reduce((sum, d) => sum + d.point_akhir, 0) * 10) / 10)
      );

      categories.push({
        kementerian: master.kementerian,
        bobot_master: master.point,
        details: detailResults,
        total_point,
      });
    }

    const grand_total = parseFloat(
      String(Math.floor(categories.reduce((sum, c) => sum + c.total_point, 0) * 10) / 10)
    );

    return {
      userId: userObjectId,
      name: user.name,
      image: (user as any).image ?? null,
      month: dateFilter?.month ?? new Date().getMonth() + 1,
      year: dateFilter?.year ?? new Date().getFullYear(),
      categories,
      grand_total,
    };
  },

  getAllKPISummary: async (dateFilter?: { year: number; month?: number }) => {
    const allUsers = await userRepository.findAllUsers();
    const summaries: any[] = [];

    for (const user of allUsers) {
      const summary = await KPICountService.getMyKPISummary(user._id.toString(), dateFilter);
      summaries.push(summary);
    }

    return summaries.sort((a, b) => b.grand_total - a.grand_total);
  },

  // GET /kpi/statistic?year=2026
  getKpiStatistic: async (year: number) => {
    const monthlyStats: any[] = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const [researchRecords, attendanceRecords] = await Promise.all([
        researchRepository.findResearchWithFilters({
          status: { $ne: null } as any,
          date: { year, month },
        }),
        attendanceRepository.findAll({
          status: attendanceStatus.PRESENT,
          createdAt: { $gte: startDate, $lte: endDate } as any,
        }),
      ]);

      const monthName = new Date(year, month - 1).toLocaleString("id-ID", { month: "long" });

      monthlyStats.push({
        month,
        monthName,
        totalResearch: researchRecords.length,
        totalAttendance: attendanceRecords.length,
      });
    }

    return { year, data: monthlyStats };
  },

  // GET /kpi/me/operational?year=2026&month=6 — leaderboard ranking
  getOperationalLeaderboard: async (dateFilter?: { year: number; month?: number }) => {
    const summaries = await KPICountService.getAllKPISummary(dateFilter);

    return summaries.map((s, index) => ({
      rank: index + 1,
      name: s.name,
      userId: s.userId,
      point: s.grand_total,
    }));
  },

  getMyOperationalSummary: async (userId: string, dateFilter?: { year: number; month?: number }) => {
    const userObjectId = new Types.ObjectId(userId);
    const masters: any[] = await KPIRepository.findAllMasters();
    const operationalMaster = masters.find((m) => m.kementerian.toLowerCase() === "operational");
    const details: any[] = operationalMaster ? await KPIRepository.findDetailsByMasterId(operationalMaster._id.toString()) : [];
    const findDetail = (name: string) => details.find((d) => d.kpi_item.toLowerCase() === name);

    const attendanceDetail = findDetail("attendance");
    const picketDetail = findDetail("picket");
    const thematicDetail = findDetail("thematic");

    const dateRange = buildDateFilter(dateFilter);
    const startDate = dateFilter ? new Date(dateFilter.year, (dateFilter.month ?? 1) - 1, 1) : undefined;
    const endDate = dateFilter ? new Date(dateFilter.year, dateFilter.month ?? 12, 0, 23, 59, 59, 999) : undefined;

    const countAttendance = attendanceDetail ? (await attendanceRepository.findAll({
      userId: userObjectId,
      id_kpi_detail: attendanceDetail._id,
      status: attendanceStatus.PRESENT,
      checkOut: { $ne: null } as any,
      ...(dateRange && { createdAt: dateRange }),
    })).length : 0;

    const countPicket = picketDetail ? (await operationalRecordRepository.findRecordsWithFilters({
      userId, id_kpi_detail: picketDetail._id.toString(), type: ScheduleType.picket, startDate, endDate,
    })).length : 0;

    const countThematic = thematicDetail ? (await operationalRecordRepository.findRecordsWithFilters({
      userId, id_kpi_detail: thematicDetail._id.toString(), type: ScheduleType.thematic, startDate, endDate,
    })).length : 0;

    const totalAttendance = attendanceDetail ? hitungPoint(attendanceDetail.point, attendanceDetail.max_activity, countAttendance, attendanceDetail.label) : 0;
    const totalPicket = picketDetail ? hitungPoint(picketDetail.point, picketDetail.max_activity, countPicket, picketDetail.label) : 0;
    const totalThematic = thematicDetail ? hitungPoint(thematicDetail.point, thematicDetail.max_activity, countThematic, thematicDetail.label) : 0;

    return {
      totalAttendance: countAttendance,
      totalPicket: countPicket,
      totalTematik: countThematic,
      pointAttendance: Math.floor(totalAttendance * 10) / 10,
      pointPicket: Math.floor(totalPicket * 10) / 10,
      pointTematik: Math.floor(totalThematic * 10) / 10,
      totalPoint: Math.floor((totalAttendance + totalPicket + totalThematic) * 10) / 10,
      year: dateFilter?.year ?? new Date().getFullYear(),
      month: dateFilter?.month ?? new Date().getMonth() + 1,
    };
  },

  getMyResearchSummary: async (userId: string, dateFilter?: { year: number; month?: number }) => {
    const masters: any[] = await KPIRepository.findAllMasters();
    const researchMaster = masters.find((m) => m.kementerian.toLowerCase() === "research");
    if (!researchMaster) return { totalApproved: 0, totalPoint: 0 };

    const details: any[] = await KPIRepository.findDetailsByMasterId(researchMaster._id.toString());
    let totalApproved = 0;
    let totalPoint = 0;

    for (const detail of details) {
      const records = await researchRepository.findResearchWithFilters({
        userId,
        id_kpi_detail: detail._id.toString(),
        status: { $ne: null } as any,
        ...(dateFilter && { date: dateFilter }),
      });
      totalApproved += records.length;
      const rawTotal = records.reduce((sum: number, r: any) => {
        return sum + hitungPointRange(detail.point, detail.max_activity, r.status || 0, detail.label);
      }, 0);
      totalPoint += rawTotal;
    }

    return {
      totalApproved,
      totalPoint: Math.floor(totalPoint * 10) / 10,
    };
  },

  getAllResearchSummary: async (dateFilter?: { year: number; month?: number }) => {
    const allUsers = await userRepository.findAllUsers();
    const masters: any[] = await KPIRepository.findAllMasters();
    const researchMaster = masters.find((m) => m.kementerian.toLowerCase() === "research");
    const details: any[] = researchMaster ? await KPIRepository.findDetailsByMasterId(researchMaster._id.toString()) : [];

    const results = [];
    for (const user of allUsers) {
      const userId = user._id.toString();
      const byCategory: Record<string, { count: number; total: number }> = {};
      let totalPoints = 0;

      for (const detail of details) {
        const records = await researchRepository.findResearchWithFilters({
          userId,
          id_kpi_detail: detail._id.toString(),
          status: { $ne: null } as any,
          ...(dateFilter && { date: dateFilter }),
        });
        const count = records.length;
        const raw = records.reduce((sum: number, r: any) => {
          return sum + hitungPointRange(detail.point, detail.max_activity, r.status || 0, detail.label);
        }, 0);
        const total = Math.floor(raw * 10) / 10;
        byCategory[detail.kpi_item] = { count, total };
        totalPoints += total;
      }

      results.push({
        userId: user._id,
        userName: user.name,
        totalPoints: Math.floor(totalPoints * 10) / 10,
        byCategory,
        year: dateFilter?.year ?? new Date().getFullYear(),
        month: dateFilter?.month ?? new Date().getMonth() + 1,
      });
    }

    return results.sort((a, b) => b.totalPoints - a.totalPoints);
  },

  getAllOperationalBreakdown: async (dateFilter?: { year: number; month?: number }) => {
    const allUsers = await userRepository.findAllUsers();
    const masters: any[] = await KPIRepository.findAllMasters();
    const operationalMaster = masters.find((m) => m.kementerian.toLowerCase() === "operational");
    const details: any[] = operationalMaster ? await KPIRepository.findDetailsByMasterId(operationalMaster._id.toString()) : [];
    const findDetail = (name: string) => details.find((d) => d.kpi_item.toLowerCase() === name);

    const attendanceDetail = findDetail("attendance");
    const picketDetail = findDetail("picket");
    const thematicDetail = findDetail("thematic");

    const dateRange = buildDateFilter(dateFilter);
    const startDate = dateFilter ? new Date(dateFilter.year, (dateFilter.month ?? 1) - 1, 1) : undefined;
    const endDate = dateFilter ? new Date(dateFilter.year, dateFilter.month ?? 12, 0, 23, 59, 59, 999) : undefined;

    const buildCategory = async (userId: string, userObjectId: Types.ObjectId, detail: any, type?: ScheduleType) => {
      if (!detail) {
        return { count: 0, code: "", point: 0, total: 0 };
      }

      let count = 0;
      if (type) {
        const records = await operationalRecordRepository.findRecordsWithFilters({
          userId,
          id_kpi_detail: detail._id.toString(),
          type,
          startDate,
          endDate,
        });
        count = records.length;
      } else {
        const records = await attendanceRepository.findAll({
          userId: userObjectId,
          id_kpi_detail: detail._id,
          status: attendanceStatus.PRESENT,
          checkOut: { $ne: null } as any,
          ...(dateRange && { createdAt: dateRange }),
        });
        count = records.length;
      }

      const total = hitungPoint(detail.point, detail.max_activity, count, detail.label);
      return { count, code: detail.kpi_item, point: detail.point, total };
    };

    const results = [];
    for (const user of allUsers) {
      const userId = user._id.toString();
      const userObjectId = new Types.ObjectId(userId);

      const attendance = await buildCategory(userId, userObjectId, attendanceDetail);
      const picket = await buildCategory(userId, userObjectId, picketDetail, ScheduleType.picket);
      const thematic = await buildCategory(userId, userObjectId, thematicDetail, ScheduleType.thematic);

      const totalPoints = parseFloat(String(Math.floor((attendance.total + picket.total + thematic.total) * 10) / 10));

      results.push({
        userId: userObjectId,
        userName: user.name,
        totalPoints,
        operationalDetail: { attendance, picket, thematic },
        year: dateFilter?.year ?? new Date().getFullYear(),
        month: dateFilter?.month ?? new Date().getMonth() + 1,
      });
    }

    return results.sort((a, b) => b.totalPoints - a.totalPoints);
  },
};

export default KPICountService;