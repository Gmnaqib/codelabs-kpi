import { KPIMaster, KPIDetail } from "../models/kpi/kpi_item/kpi.item.schema";
import { IKPIMaster, IKPIDetail } from "../models/kpi/kpi_item/kpi.item.interface";
import { Types } from "mongoose";

interface KPIMasterFilter {
  _id?: Types.ObjectId;
  kementerian?: string;
}

interface KPIDetailFilter {
  _id?: Types.ObjectId;
  id_kpi_master?: Types.ObjectId;
  kpi_item?: string;
}

const KPIRepository = {
  // KPI Master
  createMaster: (data: Partial<IKPIMaster>) => KPIMaster.create(data),
  findAllMasters: () => KPIMaster.find(),
  findMasterById: (id: string) => KPIMaster.findById(new Types.ObjectId(id)),
  findMasterByFilter: (filter: KPIMasterFilter) => KPIMaster.find(filter),
  findMasterByKementerian: (kementerian: string) => KPIMaster.findOne({ kementerian }),
  updateMaster: (id: string, data: Partial<IKPIMaster>) => KPIMaster.findByIdAndUpdate(new Types.ObjectId(id), data, { new: true }),
  deleteMaster: (id: string) => KPIMaster.findByIdAndDelete(new Types.ObjectId(id)),

  // KPI Detail 
  createDetail: (data: Partial<IKPIDetail>) => KPIDetail.create(data),
  findAllDetails: () => KPIDetail.find().populate("id_kpi_master"),
  findDetailById: (id: string) => KPIDetail.findById(new Types.ObjectId(id)),
  findDetailByFilter: (filter: KPIDetailFilter) => KPIDetail.find(filter),
  findDetailsByMasterId: (masterId: string) => KPIDetail.find({ id_kpi_master: new Types.ObjectId(masterId) }),
  updateDetail: (id: string, data: Partial<IKPIDetail>) => KPIDetail.findByIdAndUpdate(new Types.ObjectId(id), data, { new: true }),
  deleteDetail: (id: string) => KPIDetail.findByIdAndDelete(new Types.ObjectId(id)),
};

export default KPIRepository;