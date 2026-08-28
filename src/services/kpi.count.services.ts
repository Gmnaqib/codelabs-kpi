import KPIRepository from "../repository/kpi.respository";
import researchRepository from "../repository/research.repository";
import attendanceRepository from "../repository/attendance.repository";
import operationalRecordRepository from "../repository/operationalRecord.repository";
import brandingRepository from "../repository/branding.respository";
import competitionRepository from "../repository/competition.respository";
import userRepository from "../repository/user.repository";
import KPIBaselineRepository from "../repository/kpi.baseline.repository";
import spSettingService from "./spSetting.service";
import dateHelper from "../helper/dateHelper";
import { attendanceStatus } from "../models/attendance/attendance.Interface";
import { CompetitionStatus } from "../models/competition/competition.interface";
import { ScheduleType } from "../models/schedule/schedule.interface";
import { Types } from "mongoose";

// ─── Helper Functions & Filters ──────────────────────────────────────────────

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

/**
 * Fallback Kalkulasi Normal (Operational, Competition)
 */
const hitungPoint = (point: number, maxActivity: number, jumlahActivity: number, label: string): number => {
  const maxAct = maxActivity || 1;
  const pointPerActivity = point / maxAct;
  const raw = pointPerActivity * jumlahActivity;
  const result = label === "REQUIRED" ? Math.min(raw, point) : raw;
  return Math.floor(result * 10) / 10;
};

/**
 * Fallback Kalkulasi Range 0-5 (Research, Branding)
 */
const hitungPointRange = (point: number, maxActivity: number, nilaiStatus: number, label: string): number => {
  const maxAct = maxActivity || 1;
  const pointRangePer1 = point / maxAct / 5;
  const raw = pointRangePer1 * nilaiStatus;
  const result = label === "REQUIRED" ? Math.min(raw, point) : raw;
  return Math.floor(result * 10) / 10;
};

// ─── KPICountService Implementation ──────────────────────────────────────────
// SP (Surat Peringatan) thresholds are no longer hardcoded here — they're
// managed dynamically via the SPSetting collection (see spSetting.service.ts
// and the /sp-setting CRUD routes). getSPStatus below just delegates to it.

// KPI masters/details are the SAME config data for every user (not
// user-specific), so a caller looping over many users (e.g.
// attendance.service.ts's getAttendanceSummary) can fetch them ONCE and pass
// them in here via `preloaded`, instead of every getMyKPISummary call
// re-querying identical data. Falls back to fetching internally when not
// provided, so every existing caller keeps working unchanged.
interface PreloadedKpiData {
  masters?: any[];
  detailsByMaster?: Map<string, any[]>;
  user?: any;
}

// Fetches KPI masters + details ONCE (2 queries total, regardless of user
// count) and groups details by master, for reuse across many
// getMyKPISummary calls via `preloaded` — e.g. attendance.service.ts's
// getAttendanceSummary and getAllKPISummary below, both of which loop over
// every user.
const loadKpiConfig = async (): Promise<{ masters: any[]; detailsByMaster: Map<string, any[]> }> => {
  const [masters, details] = await Promise.all([
    KPIRepository.findAllMasters(),
    KPIRepository.findAllDetails(),
  ]);
  const detailsByMaster = new Map<string, any[]>();
  (details as any[]).forEach((detail) => {
    const masterId = (detail.id_kpi_master as any)?._id?.toString() ?? detail.id_kpi_master?.toString();
    if (!masterId) return;
    if (!detailsByMaster.has(masterId)) detailsByMaster.set(masterId, []);
    detailsByMaster.get(masterId)!.push(detail);
  });
  return { masters, detailsByMaster };
};

const KPICountService = {
  loadKpiConfig,

  getMyKPISummary: async (userId: string, dateFilter?: { year: number; month?: number }, preloaded?: PreloadedKpiData) => {
    const userObjectId = new Types.ObjectId(userId);
    const user = preloaded?.user ?? await userRepository.findUserById(userId);
    if (!user) throw new Error("User not found");

    const dateRange = buildDateFilter(dateFilter);
    const masters: any[] = preloaded?.masters ?? await KPIRepository.findAllMasters();
    const categories: any[] = [];
    const baselines: any[] = dateFilter ? [] : await KPIBaselineRepository.findBaselinesByUserId(userId);
    const baselineByMasterId = new Map(baselines.map((b: any) => [b.id_kpi_master.toString(), b]));

    for (const master of masters) {
      const details: any[] = preloaded?.detailsByMaster
        ? preloaded.detailsByMaster.get(master._id.toString()) ?? []
        : await KPIRepository.findDetailsByMasterId(master._id.toString());
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

          // Ambil total earned_point dari operationalRecords jika ada snapshot, gabungkan dengan attendance
          const operationalPoints = operationalRecords.reduce((sum: number, r: any) => {
            return sum + (typeof r.earned_point === "number" ? r.earned_point : (detail.point / (detail.max_activity || 1)));
          }, 0);

          // Sama seperti operationalRecords: pakai earned_point yang sudah terkunci
          // di saat check-in kalau ada, supaya perubahan point KPI sekarang tidak
          // mengubah nilai check-in yang sudah lewat. Record lama tanpa snapshot
          // (dibuat sebelum fitur ini ada) fallback ke perhitungan live.
          const attendancePoints = attendanceRecords.reduce((sum: number, r: any) => {
            return sum + (typeof r.earned_point === "number" ? r.earned_point : (detail.point / (detail.max_activity || 1)));
          }, 0);
          const totalRaw = operationalPoints + attendancePoints;

          point_akhir = detail.label === "REQUIRED" ? Math.min(totalRaw, detail.point) : totalRaw;
          point_akhir = Math.floor(point_akhir * 10) / 10;

        } else if (kementerian === "research") {
          const records = await researchRepository.findResearchWithFilters({
            userId,
            id_kpi_detail: detailId,
            status: { $ne: null } as any,
            ...(dateFilter && { date: dateFilter }),
            ...(cutoffDate && { cutoffDate }),
          });
          jumlah_activity = records.length;

          // Gunakan earned_point terkunci jika ada, jika tidak fallback ke hitungPointRange
          const rawTotal = records.reduce((sum: number, r: any) => {
            const point = typeof r.earned_point === "number" 
              ? r.earned_point 
              : hitungPointRange(detail.point, detail.max_activity, r.status || 0, detail.label);
            return sum + point;
          }, 0);

          point_akhir = detail.label === "REQUIRED" ? Math.min(rawTotal, detail.point) : rawTotal;
          point_akhir = Math.floor(point_akhir * 10) / 10;

        } else if (kementerian === "branding") {
          const records = await brandingRepository.findBrandingsByFilter(
            { userId: userObjectId, id_kpi_detail: detail._id, status: { $ne: null } },
            dateFilter ? { year: dateFilter.year, month: dateFilter.month ?? new Date().getMonth() + 1 } : undefined,
            cutoffDate
          );
          jumlah_activity = records.length;

          // Gunakan earned_point terkunci jika ada, jika tidak fallback ke hitungPointRange
          const rawBranding = records.reduce((sum: number, r: any) => {
            const point = typeof r.earned_point === "number" 
              ? r.earned_point 
              : hitungPointRange(detail.point, detail.max_activity, r.status || 0, detail.label);
            return sum + point;
          }, 0);

          point_akhir = detail.label === "REQUIRED" ? Math.min(rawBranding, detail.point) : rawBranding;
          point_akhir = Math.floor(point_akhir * 10) / 10;

        } else if (kementerian === "competition") {
          const records = await competitionRepository.findCompetitionsByFilter(
            { userId: userObjectId, id_kpi_detail: detail._id, status: CompetitionStatus.Approved },
            dateFilter ? { year: dateFilter.year, month: dateFilter.month ?? new Date().getMonth() + 1 } : undefined,
            cutoffDate
          );
          jumlah_activity = records.length;

          // Gunakan earned_point terkunci jika ada, jika tidak fallback ke hitungPoint
          const rawCompetition = records.reduce((sum: number, r: any) => {
            const point = typeof r.earned_point === "number" 
              ? r.earned_point 
              : (detail.point / (detail.max_activity || 1));
            return sum + point;
          }, 0);

          point_akhir = detail.label === "REQUIRED" ? Math.min(rawCompetition, detail.point) : rawCompetition;
          point_akhir = Math.floor(point_akhir * 10) / 10;
        }

        // Penggabungan dengan Baseline Data Historis (jika ada)
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
          point_per_activity: parseFloat(String(Math.floor((detail.point / (detail.max_activity || 1)) * 10) / 10)),
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

      // Memasukkan detail yang telah di-archive/frozen
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
    const { masters, detailsByMaster } = await loadKpiConfig();

    const summaries = await Promise.all(
      allUsers.map((user) =>
        KPICountService.getMyKPISummary(user._id.toString(), dateFilter, { masters, detailsByMaster, user })
      )
    );

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

    const picketRecords = picketDetail ? await operationalRecordRepository.findRecordsWithFilters({
      userId, id_kpi_detail: picketDetail._id.toString(), type: ScheduleType.picket, startDate, endDate,
    }) : [];

    const thematicRecords = thematicDetail ? await operationalRecordRepository.findRecordsWithFilters({
      userId, id_kpi_detail: thematicDetail._id.toString(), type: ScheduleType.thematic, startDate, endDate,
    }) : [];

    const countPicket = picketRecords.length;
    const countThematic = thematicRecords.length;

    // Kalkulasi poin dengan earned_point prioritas
    const totalAttendance = attendanceDetail ? hitungPoint(attendanceDetail.point, attendanceDetail.max_activity, countAttendance, attendanceDetail.label) : 0;
    
    const rawPicket = picketRecords.reduce((sum: number, r: any) => {
      return sum + (typeof r.earned_point === "number" ? r.earned_point : (picketDetail.point / (picketDetail.max_activity || 1)));
    }, 0);
    const totalPicket = picketDetail && picketDetail.label === "REQUIRED" ? Math.min(rawPicket, picketDetail.point) : rawPicket;

    const rawThematic = thematicRecords.reduce((sum: number, r: any) => {
      return sum + (typeof r.earned_point === "number" ? r.earned_point : (thematicDetail.point / (thematicDetail.max_activity || 1)));
    }, 0);
    const totalThematic = thematicDetail && thematicDetail.label === "REQUIRED" ? Math.min(rawThematic, thematicDetail.point) : rawThematic;

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
        const point = typeof r.earned_point === "number"
          ? r.earned_point
          : hitungPointRange(detail.point, detail.max_activity, r.status || 0, detail.label);
        return sum + point;
      }, 0);

      const cappedDetail = detail.label === "REQUIRED" ? Math.min(rawTotal, detail.point) : rawTotal;
      totalPoint += cappedDetail;
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
          const point = typeof r.earned_point === "number"
            ? r.earned_point
            : hitungPointRange(detail.point, detail.max_activity, r.status || 0, detail.label);
          return sum + point;
        }, 0);

        const total = Math.floor((detail.label === "REQUIRED" ? Math.min(raw, detail.point) : raw) * 10) / 10;
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
      let rawTotal = 0;

      if (type) {
        const records = await operationalRecordRepository.findRecordsWithFilters({
          userId,
          id_kpi_detail: detail._id.toString(),
          type,
          startDate,
          endDate,
        });
        count = records.length;
        rawTotal = records.reduce((sum: number, r: any) => {
          return sum + (typeof r.earned_point === "number" ? r.earned_point : (detail.point / (detail.max_activity || 1)));
        }, 0);
      } else {
        const records = await attendanceRepository.findAll({
          userId: userObjectId,
          id_kpi_detail: detail._id,
          status: attendanceStatus.PRESENT,
          checkOut: { $ne: null } as any,
          ...(dateRange && { createdAt: dateRange }),
        });
        count = records.length;
        rawTotal = count * (detail.point / (detail.max_activity || 1));
      }

      const total = Math.floor((detail.label === "REQUIRED" ? Math.min(rawTotal, detail.point) : rawTotal) * 10) / 10;
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

  getMySPStatus: async (userId: string, dateFilter?: { year: number; month?: number }) => {
    const summary = await KPICountService.getMyKPISummary(userId, dateFilter);
    const status = await spSettingService.resolveStatus(summary.grand_total);

    return {
      userId: summary.userId,
      name: summary.name,
      month: summary.month,
      year: summary.year,
      ...status,
    };
  },

  getSPStatus: spSettingService.resolveStatus,

  getAllSPStatus: async (dateFilter?: { year: number; month?: number }) => {
    const summaries = await KPICountService.getAllKPISummary(dateFilter);

    return Promise.all(summaries.map(async (s) => {
      const status = await spSettingService.resolveStatus(s.grand_total);
      return {
        userId: s.userId,
        name: s.name,
        month: s.month,
        year: s.year,
        ...status,
      };
    }));
  },
};

export default KPICountService;