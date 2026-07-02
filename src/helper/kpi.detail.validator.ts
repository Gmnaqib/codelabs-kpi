import { KPIDetail } from "../models/kpi/kpi_item/kpi.item.schema";
import { KPIMaster } from "../models/kpi/kpi_item/kpi.item.schema";

/**
 * Cari id_kpi_detail otomatis berdasarkan kementerian + nama kpi_item (case-insensitive).
 * Dipakai untuk fitur yang tidak punya UI pemilihan KPI detail (checkbox/checkin), supaya
 * record yang dibuat tetap tertaut ke KPI detail yang benar untuk perhitungan point.
 */
export const resolveKpiDetailId = async (kementerian: string, kpiItem: string) => {
  const master = await KPIMaster.findOne({ kementerian: { $regex: new RegExp(`^${kementerian}$`, "i") } });
  if (!master) return undefined;
  const detail = await KPIDetail.findOne({ id_kpi_master: master._id, kpi_item: { $regex: new RegExp(`^${kpiItem}$`, "i") } });
  return detail?._id;
};

/**
 * Validasi bahwa id_kpi_detail yang diberikan milik kementerian yang benar.
 * Throws error jika tidak sesuai.
 */
export const validateKpiDetailKementerian = async (
  id_kpi_detail: string,
  expectedKementerian: string
): Promise<void> => {
  const detail = await KPIDetail.findById(id_kpi_detail);
  if (!detail) throw new Error("KPI detail not found");

  const master = await KPIMaster.findById(detail.id_kpi_master);
  if (!master) throw new Error("KPI master not found");

  if (master.kementerian.toLowerCase() !== expectedKementerian.toLowerCase()) {
    throw new Error(
      `Invalid KPI detail. Expected detail from '${expectedKementerian}' department, got '${master.kementerian}'`
    );
  }
};