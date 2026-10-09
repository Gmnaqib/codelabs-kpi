import PointTransaction from "../models/pointTransaction/pointTransaction.schema";
import IPointTransaction from "../models/pointTransaction/pointTransaction.interface";
import { Types } from "mongoose";

const pointTransactionRepository = {
  create: (data: Partial<IPointTransaction>) => PointTransaction.create(data),

  findByUserId: (userId: string) =>
    PointTransaction.find({ userId: new Types.ObjectId(userId) })
      .populate("createdBy", "_id name")
      .sort({ createdAt: -1 }),

  sumByUserId: async (userId: string): Promise<number> => {
    const rows = await PointTransaction.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return rows[0]?.total ?? 0;
  },
};

export default pointTransactionRepository;
