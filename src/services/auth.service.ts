import userRepository from "../repository/user.repository";
import authValidate from "../validators/auth.validator";
import IUser, { Research } from "../models/user/user.interface";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";

const authService = {
  createMultipleUsers: async (emails: string[]): Promise<{ createdUsers: IUser[]; skippedUsers: string[] }> => {
    await authValidate.createMultipleUsers(emails);
    const password: string = "password";
    const createdUsers: IUser[] = [];
    const skippedUsers: string[] = [];

    for (const email of emails) {
      let [name, rest] = email.split(".");
      let nim = rest.split("@")[0];
      let majors = nim.substring(0, 3);
      let years = "20" + nim.substring(3, 5);

      let major = "";
      if (majors === "101") major = "Teknik Informatika";
      else if (majors === "105") major = "Sistem Informasi";
      else if (majors === "121") major = "Desain Komunikasi Visual";
      else major = "Unknown";

      const existingUser = await userRepository.findUserByNim(nim);

      if (existingUser) {
        skippedUsers.push(email);
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser: IUser = await userRepository.createUser({
        name,
        email,
        password: hashedPassword,
        nim,
        majors: major,
        years,
      });

      createdUsers.push(newUser);
    }

    return { createdUsers, skippedUsers };
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    nim: string;
    majors: string;
    years: string;
    research?: Research;
    telegram_id?: string;
    telegram_username?: string;
  }): Promise<IUser> => {
    await authValidate.register(userData);

    const { name, email, password, nim, majors, years, research, telegram_id, telegram_username } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);

    return await userRepository.createUser({
      name,
      email,
      password: hashedPassword,
      nim,
      majors,
      years,
      research,
      telegram_id,
      telegram_username,
    });
  },

  login: async (nim: string, password: string): Promise<{ user: any; token: string }> => {
    await authValidate.login(nim, password);

    const user = await userRepository.findUserByNim(nim, true);

    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        nim: user.nim,
        majors: user.majors,
        years: user.years,
        image: user.image,
        status: user.status,
        research: user.research,
        change_mac_address: user.change_mac_address,
        mac_address: user.mac_address,
      },
      secret,
      { expiresIn: "1d" },
    );

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        nim: user.nim,
        role: user.role,
        mac_address: user.mac_address,
        change_mac_address: user.change_mac_address,
        image: user.image ?? null,
        majors: user.majors,
        years: user.years,
        status: user.status,
        research: user.research,
      },
      token,
    };
  },

  getMe: async (user: any): Promise<IUser> => {
    authValidate.getMe(user);
    const fullUser = await userRepository.findUserById(user.id);
    if (!fullUser) {
      throw new Error("User not found");
    }
    return fullUser;
  },
};

export default authService;
