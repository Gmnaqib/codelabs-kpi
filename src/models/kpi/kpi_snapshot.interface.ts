import { Schema } from "mongoose";

export interface IKPISnapshot {
  kpi_item_name: string;   // Nama item saat aktivitas dicatat (misal: "Research Paper")
  item_point: number;      // Bobot poin master saat itu (misal: 20)
  max_activity: number;    // Target max aktivitas saat itu (misal: 5)
  label: "REQUIRED" | "OPTIONAL";
}

export const kpiSnapshotSchema = new Schema<IKPISnapshot>(
  {
    kpi_item_name: { 
      type: String, 
      required: true 
    },
    item_point: { 
      type: Number, 
      required: true 
    },
    max_activity: { 
      type: Number, 
      required: true 
    },
    label: { 
      type: String, 
      enum: ["REQUIRED", "OPTIONAL"], 
      required: true 
    },
  },
  { 
    _id: false // Tidak perlu generate _id terpisah untuk subdocument snapshot
  }
);