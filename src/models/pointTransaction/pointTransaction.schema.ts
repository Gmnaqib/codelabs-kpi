import { Schema, model } from "mongoose";
import IPointTransaction from "./pointTransaction.interface";

const pointTransactionSchema = new Schema<IPointTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0.1 },
    reason: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

pointTransactionSchema.index({ userId: 1, createdAt: -1 });

const PointTransaction = model<IPointTransaction>("PointTransaction", pointTransactionSchema, "point_transactions");
export default PointTransaction;
