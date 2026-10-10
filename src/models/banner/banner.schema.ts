import { Schema, model } from "mongoose";
import { IBanner, IUserBanner } from "./banner.interface";

const bannerSchema = new Schema<IBanner>(
  {
    name: { type: String, required: true },
    point_cost: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
  },
  { timestamps: true },
);

export const Banner = model<IBanner>("Banner", bannerSchema, "banners");

// One row per (user, banner) a user has bought — ownership/inventory.
// Which banner is currently EQUIPPED lives on User.active_banner_id instead,
// so a user can own several banners but only display one at a time.
const userBannerSchema = new Schema<IUserBanner>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bannerId: { type: Schema.Types.ObjectId, ref: "Banner", required: true },
  },
  { timestamps: true },
);
userBannerSchema.index({ userId: 1, bannerId: 1 }, { unique: true });

export const UserBanner = model<IUserBanner>("UserBanner", userBannerSchema, "user_banners");

export default Banner;
