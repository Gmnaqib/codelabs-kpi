import { Banner, UserBanner } from "../models/banner/banner.schema";
import { IBanner } from "../models/banner/banner.interface";
import { Types } from "mongoose";

const bannerRepository = {
  create: (data: Partial<IBanner>) => Banner.create(data),
  findAll: () => Banner.find().sort({ createdAt: -1 }),
  findById: (id: string) => Banner.findById(new Types.ObjectId(id)),
  updateById: (id: string, data: Partial<IBanner>) => Banner.findByIdAndUpdate(new Types.ObjectId(id), data, { new: true }),
  deleteById: (id: string) => Banner.findByIdAndDelete(new Types.ObjectId(id)),

  // Ownership
  createOwnership: (userId: Types.ObjectId, bannerId: Types.ObjectId) =>
    UserBanner.create({ userId, bannerId }),
  findOwnership: (userId: string, bannerId: string) =>
    UserBanner.findOne({ userId: new Types.ObjectId(userId), bannerId: new Types.ObjectId(bannerId) }),
  findOwnedByUserId: (userId: string) =>
    UserBanner.find({ userId: new Types.ObjectId(userId) }).populate("bannerId").sort({ createdAt: -1 }),
  deleteOwnershipByBannerId: (bannerId: string) => UserBanner.deleteMany({ bannerId: new Types.ObjectId(bannerId) }),
};

export default bannerRepository;
