import { Types } from "mongoose";
import { IKPISnapshot } from "../kpi/kpi_snapshot.interface";

interface ICompetition {
    userId: Types.ObjectId;
    id_kpi_detail: Types.ObjectId;
    name: string;
    description: string;
    deadline: Date;
    link: string;
    status: CompetitionStatus;
    type: CompetitionType;
    earned_point?: number;  
    kpi_snapshot?: IKPISnapshot; 
    createdAt?: Date;
    updatedAt?: Date;
}

export enum CompetitionType {
    National = "national",
    International = "international",
}

export enum CompetitionStatus {
    Approved = "approved",
    Rejected = "rejected",
    Pending = "pending",
}

export default ICompetition;