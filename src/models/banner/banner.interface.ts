import { Types } from "mongoose";

export interface IBanner {
  name: string;
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
