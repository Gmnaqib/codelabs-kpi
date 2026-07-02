// import { Types } from "mongoose";
// import Attendance from "../models/attendance/attendance.schema";
// import Research from "../models/research/research.schema";
// import Competition from "../models/competition/competition.schema";
// import Branding from "../models/branding/branding.schema";
// import OperationalRecord from "../models/operationalRecord/operational.schema";
// import { attendanceStatus } from "../models/attendance/attendance.Interface";
// import { CompetitionStatus } from "../models/competition/competition.interface";
// import { brandingStatus } from "../models/branding/branding.interface";
// import { statusResearch } from "../models/research/research.interface";

// interface KPICalculationResult {
//   attendance: number;
//   research: number;
//   competition: number;
//   operational: number;
//   branding: number;
// }

// const KPICalculator = {
//   calculateAttendanceScore: async (userId: string | Types.ObjectId, month?: number, year?: number): Promise<number> => {
//     try {
//       const query: any = { userId: new Types.ObjectId(userId) };

//       if (month && year) {
//         const startDate = new Date(year, month - 1, 1);
//         const endDate = new Date(year, month, 0, 23, 59, 59);
//         query.checkIn = { $gte: startDate, $lte: endDate };
//       }

//       const attendanceRecords = await Attendance.find(query);

//       let score = 0;

//       //Hitung Point Attendance
//       attendanceRecords.forEach((record) => {
//         if (record.status === attendanceStatus.PRESENT) {
//           score += 5;
//         }
//       });

//       return score;
//     } catch (error) {
//       console.error("Error calculating attendance score:", error);
//       return 0;
//     }
//   },

//   // Hitung point research
//   calculateResearchScore: async (userId: string | Types.ObjectId, month?: number, year?: number): Promise<number> => {
//     try {
//       const query: any = { userId: new Types.ObjectId(userId) };

//       if (month && year) {
//         const startDate = new Date(year, month - 1, 1);
//         const endDate = new Date(year, month, 0, 23, 59, 59);
//         query.createdAt = { $gte: startDate, $lte: endDate };
//       }

//       const researchRecords = await Research.find(query);

//       let score = 0;

//       researchRecords.forEach((record) => {
//         if (record.status === statusResearch.approved) {
//           score += 30;
//         }
//       });

//       return score;
//     } catch (error) {
//       console.error("Error calculating research score:", error);
//       return 0;
//     }
//   },

//   // Hitung point competition
//   calculateCompetitionScore: async (userId: string | Types.ObjectId, month?: number, year?: number): Promise<number> => {
//     try {
//       const query: any = { userId: new Types.ObjectId(userId) };

//       if (month && year) {
//         const startDate = new Date(year, month - 1, 1);
//         const endDate = new Date(year, month, 0, 23, 59, 59);
//         query.createdAt = { $gte: startDate, $lte: endDate };
//       }

//       const competitionRecords = await Competition.find(query);

//       let score = 0;

//       competitionRecords.forEach((record) => {
//         if (record.status === CompetitionStatus.Approved) {
//           score += 25;
//         }
//       });

//       return Math.max(0, score);
//     } catch (error) {
//       console.error("Error calculating competition score:", error);
//       return 0;
//     }
//   },

//   // Hitung point operational
//   calculateOperationalScore: async (userId: string | Types.ObjectId, month?: number, year?: number): Promise<number> => {
//     try {
//       const query: any = { userId: new Types.ObjectId(userId) };

//       if (month && year) {
//         const startDate = new Date(year, month - 1, 1);
//         const endDate = new Date(year, month, 0, 23, 59, 59);
//         query.date = { $gte: startDate, $lte: endDate };
//       }

//       const operationalRecords = await OperationalRecord.find(query);
//       return operationalRecords.length * 5;
//     } catch (error) {
//       console.error("Error calculating operational score:", error);
//       return 0;
//     }
//   },

//   // Hitung point branding
//   calculateBrandingScore: async (userId: string | Types.ObjectId, month?: number, year?: number): Promise<number> => {
//     try {
//       const query: any = { userId: new Types.ObjectId(userId) };

//       if (month && year) {
//         const startDate = new Date(year, month - 1, 1);
//         const endDate = new Date(year, month, 0, 23, 59, 59);
//         query.createdAt = { $gte: startDate, $lte: endDate };
//       }

//       const brandingRecords = await Branding.find(query);

//       let score = 0;

//       brandingRecords.forEach((record) => {
//         if (record.status === brandingStatus.Approved) {
//           score += 20;
//         }
//       });

//       return score;
//     } catch (error) {
//       console.error("Error calculating branding score:", error);
//       return 0;
//     }
//   },

//   // Hitung semua skor KPI
//   calculateAllScores: async (userId: string | Types.ObjectId, month?: number, year?: number): Promise<KPICalculationResult> => {
//     const [attendance, research, competition, operational, branding] = await Promise.all([
//       KPICalculator.calculateAttendanceScore(userId, month, year),
//       KPICalculator.calculateResearchScore(userId, month, year),
//       KPICalculator.calculateCompetitionScore(userId, month, year),
//       KPICalculator.calculateOperationalScore(userId, month, year),
//       KPICalculator.calculateBrandingScore(userId, month, year),
//     ]);

//     return {
//       attendance,
//       research,
//       competition,
//       operational,
//       branding,
//     };
//   },
// };

// export default KPICalculator;
