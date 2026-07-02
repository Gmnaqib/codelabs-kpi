import userRepository from "../repository/user.repository";
import { Types } from "mongoose";
import { Role, Status, Research } from "../models/user/user.interface";

export const userValidate = {
  updateByUser: async (userId: string, userData: { name?: string; password?: string; address?: string }, hasFile?: boolean): Promise<void> => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }

    const { name, password, address } = userData || {};

    // At least one field must be provided (or a file upload)
    if (!name && !password && !address && !hasFile) {
      throw new Error("At least one field (name, password, or address) must be provided");
    }

    // Validate name if provided
    if (name !== undefined && (!name || name.trim().length === 0)) {
      throw new Error("Name cannot be empty");
    }

    // Validate password if provided
    if (password !== undefined && (!password || password.length < 6)) {
      throw new Error("Password must be at least 6 characters long");
    }

    const user = await userRepository.findUserById(userId, true);

    if (!user) {
      throw new Error("User not found");
    }
  },

  updateByAdmin: async (
    userId: string,
    userData: {
      name?: string;
      password?: string;
      role?: Role;
      status?: Status;
      research?: Research;
      product_id?: string;
      change_mac_address?: boolean;
    },
  ): Promise<void> => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }

    const { name, password, role, status, research, product_id, change_mac_address } = userData;

    // At least one field must be provided
    if (!name && !password && !role && !status && !research && !product_id && change_mac_address === undefined) {
      throw new Error("At least one field must be provided for update");
    }

    // Validate name if provided
    if (name !== undefined && (!name || name.trim().length === 0)) {
      throw new Error("Name cannot be empty");
    }

    // Validate password if provided
    if (password !== undefined && (!password || password.length < 6)) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Validate role if provided
    if (role !== undefined && !["admin", "user"].includes(role)) {
      throw new Error("Invalid role. Must be 'admin' or 'user'");
    }

    // Validate status if provided
    if (status !== undefined && !["active", "inactive"].includes(status)) {
      throw new Error("Invalid status. Must be 'active' or 'inactive'");
    }

    const user = await userRepository.findUserById(userId, true);

    if (!user) {
      throw new Error("User not found");
    }
  },

  updateDeviceId: async (userId: string): Promise<void> => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }

    const user = await userRepository.findUserById(userId, true);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.change_mac_address !== true) {
      throw new Error("You don't have permission to change device ID");
    }
  },

  updateUserRole: async (userId: string, role: Role): Promise<void> => {
    if (!userId || !role) {
      throw new Error("User ID and roleName are required");
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }

    // Validate role
    if (!["admin", "user"].includes(role)) {
      throw new Error("Invalid role. Must be 'admin' or 'user'");
    }

    const user = await userRepository.findUserById(userId, true);

    if (!user) {
      throw new Error("User not found");
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }

    const user = await userRepository.findUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }
  },
};

export default userValidate;
