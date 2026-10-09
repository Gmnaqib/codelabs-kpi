import KPICountService from "./kpi.count.services";
import userRepository from "../repository/user.repository";
import pointTransactionRepository from "../repository/pointTransaction.repository";
import { Types } from "mongoose";

const round1 = (n: number) => Math.floor(n * 10) / 10;

// Total ever earned — computed on demand by summing every month's already-
// correct, already-capped grand_total (reusing KPICountService's monthly
// logic month by month) from the user's join date up to the current month.
// Nothing is cached: today's new activity is reflected the instant it's
// queried, and this never touches/duplicates the monthly KPI records.
const getTotalEarned = async (userId: string): Promise<number> => {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new Error("User not found");

  const joined: Date = (user as any).createdAt ? new Date((user as any).createdAt) : new Date();
  const now = new Date();

  let total = 0;
  let y = joined.getFullYear();
  let m = joined.getMonth() + 1;
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;

  while (y < endY || (y === endY && m <= endM)) {
    const summary = await KPICountService.getMyKPISummary(userId, { year: y, month: m });
    total += summary.grand_total;

    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return round1(total);
};

const getWalletBalance = async (userId: string): Promise<{ totalEarned: number; totalSpent: number; balance: number }> => {
  const [totalEarned, totalSpent] = await Promise.all([
    getTotalEarned(userId),
    pointTransactionRepository.sumByUserId(userId),
  ]);

  return {
    totalEarned,
    totalSpent: round1(totalSpent),
    balance: round1(totalEarned - totalSpent),
  };
};

// Redeeming only ever writes a PointTransaction (a deduction) — it never
// touches Attendance/Research/Branding/Competition/OperationalRecord or the
// KPI summary machinery, so a month's already-displayed total never changes
// because someone redeemed points later.
const redeemPoints = async (userId: string, amount: number, reason: string, createdBy: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId format");
  if (!Types.ObjectId.isValid(createdBy)) throw new Error("Invalid createdBy format");
  if (!amount || amount <= 0) throw new Error("Amount must be a positive number");
  if (!reason || !reason.trim()) throw new Error("Reason is required");

  const { balance } = await getWalletBalance(userId);
  if (amount > balance) {
    throw new Error(`Insufficient points. Current balance: ${balance}, requested: ${amount}`);
  }

  const transaction = await pointTransactionRepository.create({
    userId: new Types.ObjectId(userId),
    amount,
    reason: reason.trim(),
    createdBy: new Types.ObjectId(createdBy),
  });

  const walletAfter = await getWalletBalance(userId);
  return { transaction, wallet: walletAfter };
};

const getHistory = async (userId: string) => {
  return await pointTransactionRepository.findByUserId(userId);
};

export default {
  getTotalEarned,
  getWalletBalance,
  redeemPoints,
  getHistory,
};
