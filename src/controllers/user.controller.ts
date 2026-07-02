import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middlewares";
import response from "../helper/response";
import userService from "../services/user.service";
import { getClientIp } from "../helper/networkHelper";

const userController = {
  getAllUsers: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const currentUserRole = req.user?.role;
      const users = await userService.getAllUsers(currentUserRole);
      return response({ res, code: 200, message: "Get all user success", data: users });
    } catch (error) {
      return response({ res, code: 500, message: "Error fetching users" });
    }
  },

  getUserById: async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = req.params.id as string;
      const user = await userService.getUserById(userId as string);
      return response({ res, code: 200, message: "User fetched successfully", data: user });
    } catch (error: any) {
      return response({ res, code: error.message === "User not found" ? 404 : 500, message: error.message });
    }
  },

  updateByUser: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return response({ res, code: 401, message: "Unauthorized", data: null });
      }

      // Safely extract body data
      const body = req.body || {};
      const { name, password, address } = body;
      const file = req.file;

      const user = await userService.updateByUser(userId, { name, password, address }, file);
      return response({ res, code: 200, message: "User updated successfully", data: user });
    } catch (error: any) {
      return response({ res, code: error.message === "User not found" ? 404 : 500, message: error.message, data: null });
    }
  },

  updateByAdmin: async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = req.params.id as string;
      const { name, password, role, status, research, change_mac_address, mac_address, product_id } = req.body;

      const user = await userService.updateByAdmin(userId as string, {
        name,
        password,
        role,
        status,
        research,
        change_mac_address,
        mac_address,
        product_id,
      });

      return response({ res, code: 200, message: "User updated successfully", data: user });
    } catch (error: any) {
      return response({ res, code: error.message === "User not found" ? 404 : 500, message: error.message, data: null });
    }
  },

  updateDeviceId: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      const clientIp = getClientIp(req);

      const user = await userService.updateDeviceId(userId, clientIp);
      return response({ res, code: 200, message: "Device registered successfully", data: user });
    } catch (error: any) {
      return response({ res, code: error.message === "User not found" ? 404 : 500, message: error.message, data: null });
    }
  },

  updateUserRole: async (req: Request, res: Response): Promise<any> => {
    try {
      const { userId, role } = req.body;
      const user = await userService.updateUserRole(userId, role);
      return response({ res, code: 200, message: "User role updated successfully", data: user });
    } catch (error: any) {
      return response({ res, code: error.message === "User not found" ? 404 : 500, message: error.message });
    }
  },

  deleteUser: async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = req.params.id as string;
      const user = await userService.deleteUser(userId as string);
      return response({ res, code: 200, message: "User deleted successfully", data: user });
    } catch (error: any) {
      return response({ res, code: error.message === "User not found" ? 404 : 500, message: error.message });
    }
  },
};

export default userController;
