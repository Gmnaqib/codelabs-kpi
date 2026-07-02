import { Schema, model } from "mongoose";
import mongoose from "mongoose";
import IBranding, { BRANDING_STATUS_VALUES, researchCategory, brandingLevel } from "./branding.interface";

const brandingSchema = new Schema<IBranding>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    id_kpi_detail: { type: mongoose.Schema.Types.ObjectId, ref: "KPIDetail", default: null },
    name: { type: String, required: true },
    description: { type: String, required: true },
    link: { type: String, required: true },
    status: {
      type: Number,
      enum: BRANDING_STATUS_VALUES,
      default: null,
      min: 0,
      max: 5,
      required: false,
    },
    research: {
      type: String,
      enum: Object.values(researchCategory),
      required: true,
    },
    level: {
      type: String,
      enum: Object.values(brandingLevel),
      required: true,
    },
  },
  { timestamps: true }
);

const Branding = model<IBranding>("Branding", brandingSchema);
export default Branding;