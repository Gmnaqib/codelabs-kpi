import { Schema, model } from "mongoose";
import IUser from "./user.interface";

const userSchema = new Schema<IUser>(
  {
    nim: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    dob: {
      type: Date,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        "admin",
        "lecturer",
        "minister of research",
        "minister of competition",
        "minister of branding",
        "minister of operation",
        "president",
        "minister of research and operation",
        "minister of research and competition",
        "vice president",
        "user",
      ],
      default: "user",
    },
    majors: {
      type: String,
      required: true,
    },
    years: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "graduated"],
      default: "active",
    },
    research: {
      type: String,
      enum: ["website", "mobile", "game", "ui/ux", "data", "IoT", "other"],
      required: false,
    },
    product_id: {
      type: String,
      required: false,
    },
    telegram_id: {
      type: String,
      required: false,
    },
    telegram_username: {
      type: String,
      required: false,
    },
    mac_address: {
      type: String,
      required: false,
    },
    change_mac_address: {
      type: Boolean,
      default: true,
    },
    image_updated_at: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true },
);

const User = model<IUser>("User", userSchema);
export default User;
