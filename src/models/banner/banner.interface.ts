import { Types } from "mongoose";

export enum BannerType {
  // Background shown behind a user's name (KPI Rankings row, etc).
  NameBackground = "name_background",
  // Decorative ring/border shown around a user's circular profile picture.
  ProfileFrame = "profile_frame",
}

export interface IBanner {
  name: string;
  type: BannerType;
  point_cost: number;
  image: string; // e.g. "/uploads/banners/<file>"
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserBanner {
  userId: Types.ObjectId;
  bannerId: Types.ObjectId;
  createdAt?: Date;
}

export default IBanner;
