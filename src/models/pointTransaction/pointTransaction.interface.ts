import { Types } from "mongoose";

// A single point REDEMPTION (spend) — the "earned" side is never stored
// here, it's always computed on demand from the monthly KPI summaries
// (see pointWallet.service.ts), so this collection only ever grows by
// subtraction, never by addition.
export interface IPointTransaction {
  userId: Types.ObjectId;
  amount: number; // positive number, points deducted
  reason: string;
  createdBy: Types.ObjectId; // admin who processed the redemption
  createdAt?: Date;
}

export default IPointTransaction;
