import userRepository from "../repository/user.repository";
import userValidate from "../validators/user.validator";
import IUser, { Role, Status, Research } from "../models/user/user.interface";
import mikrotikService from "./mikrotik.service";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const userService = {
  getAllUsers: async (currentUserRole?: Role): Promise<IUser[]> => {
    const users = await userRepository.findAllUsers();

    if (currentUserRole === Role.Admin) {
      return users;
    }

    return users.filter((user) => user.role !== Role.Admin && user.role !== Role.Lecturer);
  },

  getUserById: async (userId: string): Promise<IUser> => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  },

  updateByUser: async (userId: string, userData: { name?: string; password?: string; address?: string }, imageFile?: Express.Multer.File): Promise<IUser> => {
    await userValidate.updateByUser(userId, userData, !!imageFile);
    const { name, password, address } = userData;
    const user = await userRepository.findUserById(userId, true);

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user!.password = hashedPassword;
    }
    user!.name = name || user!.name;
    if (address) user!.address = address;

    // Handle image upload
    if (imageFile) {
      // Check 24-hour cooldown (skip for admin)
      if (user!.role !== "admin" && user!.image_updated_at) {
        const diffMs = Date.now() - new Date(user!.image_updated_at).getTime();
        if (diffMs < 7 * 24 * 60 * 60 * 1000) {
          const remaining = 7 * 24 * 60 * 60 * 1000 - diffMs;
          const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
          const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          throw new Error(`Foto baru bisa diubah dalam ${days} hari ${hours} jam ${minutes} menit lagi`);
        }
      }

      // Delete old image if exists
      if (user!.image) {
        const oldImagePath = path.join(process.cwd(), user!.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new image path and update timestamp
      const imageUrl = `/uploads/profiles/${imageFile.filename}`;
      user!.image = imageUrl;
      (user as any).image_updated_at = new Date();
    }

    await user!.save();
    return user!;
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
      mac_address?: string;
    },
  ): Promise<IUser> => {
    const { name, password, role, status, research, product_id, change_mac_address, mac_address } = userData;
    const user = await userRepository.findUserById(userId, true);

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user!.password = hashedPassword;
    }

    if (name) user!.name = name;
    if (role) user!.role = role;
    if (status) user!.status = status;
    if (research) user!.research = research;
    if (product_id) user!.product_id = product_id;
    if (change_mac_address !== undefined) user!.change_mac_address = change_mac_address;
    if (mac_address) user!.mac_address = mac_address.toUpperCase().replace(/-/g, ":");

    await user!.save();
    return user!;
  },

  updateDeviceId: async (userId: string, clientIp: string): Promise<IUser> => {
    await userValidate.updateDeviceId(userId);

    // Resolve MAC address from MikroTik DHCP lease using client IP
    const detectedMac = await mikrotikService.getMacAddressByIp(clientIp);

    const user = await userRepository.findUserById(userId, true);

    if (!detectedMac) {
      throw new Error("Device not found in MikroTik DHCP lease");
    }

    user!.mac_address = detectedMac;
    user!.change_mac_address = false;
    await user!.save();
    return user!;
  },

  updateUserRole: async (userId: string, role: Role): Promise<IUser> => {
    await userValidate.updateUserRole(userId, role);

    const user = await userRepository.findUserById(userId, true);

    user!.role = role;
    await user!.save();
    return user!;
  },

  deleteUser: async (userId: string): Promise<IUser | null> => {
    await userValidate.deleteUser(userId);

    const user = await userRepository.deleteUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  },
};

export default userService;
