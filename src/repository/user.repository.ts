import User from "../models/user/user.schema";
import IUser, { Role, Status, Research } from "../models/user/user.interface";
import { Types } from "mongoose";

interface UserFilter {
  _id?: Types.ObjectId | string;
  name?: string;
  email?: string;
  nim?: string;
  majors?: string;
  years?: string;
  role?: Role;
  status?: Status;
  research?: Research;
  mac_address?: string;
  change_mac_address?: boolean;
  telegram_id?: string;
  telegram_username?: string;
}

const userRepository = {
  createUser: (userData: Partial<IUser>) => User.create(userData),
  findAllUsers: (includePassword: boolean = false) => (includePassword ? User.find() : User.find().select("-password")),
  findUserById: (id: string, includePassword: boolean = false) => (includePassword ? User.findById(id) : User.findById(id).select("-password")),
  findUser: (filter: UserFilter, includePassword: boolean = false) => (includePassword ? User.findOne(filter) : User.findOne(filter).select("-password")),
  findUsersByFilter: (filter: UserFilter, includePassword: boolean = false) => (includePassword ? User.find(filter) : User.find(filter).select("-password")),
  // Used only by the KPI summary path (kpi.count.services.ts), which needs
  // each user's equipped banner image for the Rankings card — kept separate
  // from the general-purpose finders above so every other call site (auth,
  // profile, etc.) isn't stuck with an extra join it doesn't need.
  findUserByIdWithBanner: (id: string) => User.findById(id).select("-password").populate("active_banner_id"),
  findUsersByFilterWithBanner: (filter: UserFilter) => User.find(filter).select("-password").populate("active_banner_id"),
  findUserByEmail: (email: string, includePassword: boolean = false) => userRepository.findUser({ email }, includePassword),
  findUserByNim: (nim: string, includePassword: boolean = false) => {
    const query = includePassword ? User.findOne({ nim }) : User.findOne({ nim }).select("-password");
    return query.select("+image");
  },
  findUserMacAddress: (id: Types.ObjectId) => User.findById(id).select("mac_address"),
  updateUserById: (id: string, updateData: Partial<IUser>) => User.findByIdAndUpdate(id, updateData, { new: true }).select("-password"),
  updateUser: (filter: UserFilter, updateData: Partial<IUser>) => User.updateOne(filter, updateData),
  // Used when a Banner is deleted — un-equips it for every user who had it active.
  clearActiveBannerId: (bannerId: string) => User.updateMany({ active_banner_id: bannerId }, { active_banner_id: null }),
  deleteUserById: (id: string) => User.findByIdAndDelete(id),
  deleteUser: (filter: UserFilter) => User.deleteOne(filter),
};

export default userRepository;
