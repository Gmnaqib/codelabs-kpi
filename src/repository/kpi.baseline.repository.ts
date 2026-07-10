import { KPIBaseline } from "../models/kpi/kpi_baseline/kpi.baseline.schema";
import { IKPIBaseline } from "../models/kpi/kpi_baseline/kpi.baseline.interface";
import { Types } from "mongoose";

const KPIBaselineRepository = {
  createBaseline: (data: Partial<IKPIBaseline>) => KPIBaseline.create(data),
  findBaseline: (userId: string, id_kpi_master: string) =>
    KPIBaseline.findOne({ userId: new Types.ObjectId(userId), id_kpi_master: new Types.ObjectId(id_kpi_master) }),
  findBaselinesByUserId: (userId: string) => KPIBaseline.find({ userId: new Types.ObjectId(userId) }),
  deleteBaseline: (id: string) => KPIBaseline.findByIdAndDelete(new Types.ObjectId(id)),
};

export default KPIBaselineRepository;
