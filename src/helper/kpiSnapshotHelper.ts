import { IKPIDetail } from "../models/kpi/kpi_item/kpi.item.interface";
import { IKPISnapshot } from "../models/kpi/kpi_snapshot.interface";

export class KPISnapshotHelper {
    static createSnapshot(kpiDetail: IKPIDetail): IKPISnapshot {
        return {
        kpi_item_name: kpiDetail.kpi_item,
        item_point: kpiDetail.point,
        max_activity: kpiDetail.max_activity,
        label: kpiDetail.label,
        };
    }

    static calculateNormalPoint(kpiDetail: IKPIDetail | IKPISnapshot): number {
        const totalPoint = "item_point" in kpiDetail ? kpiDetail.item_point : kpiDetail.point;
        const maxActivity = kpiDetail.max_activity || 1;

        const pointPerActivity = totalPoint / maxActivity;
        return Math.floor(pointPerActivity * 10) / 10;
    }

    static calculateRangePoint(kpiDetail: IKPIDetail | IKPISnapshot, statusScore: number): number {
        const totalPoint = "item_point" in kpiDetail ? kpiDetail.item_point : kpiDetail.point;
        const maxActivity = kpiDetail.max_activity || 1;

        const pointRangePer1 = totalPoint / maxActivity / 5;
        const rawPoint = pointRangePer1 * statusScore;
        return Math.floor(rawPoint * 10) / 10;
    }
}

export default KPISnapshotHelper;