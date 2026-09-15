import { DateTime } from "luxon";

const ZONE = "Asia/Jakarta";

const dateHelper = {
  getStartOfDayWIB(date?: Date): Date {
    const base = date ? DateTime.fromJSDate(date) : DateTime.now();
    return base.setZone(ZONE).startOf("day").toJSDate();
  },

  getEndOfDayWIB(date?: Date): Date {
    const base = date ? DateTime.fromJSDate(date) : DateTime.now();
    return base.setZone(ZONE).endOf("day").toJSDate();
  },

  getMonthRangeWIB(year: number, month: number): { start: Date; end: Date } {
    const start = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE }).startOf("day").toJSDate();
    const end = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE }).endOf("month").toJSDate();
    return { start, end };
  },

  formatDateWIB(date: Date): string {
    return DateTime.fromJSDate(date).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm:ss");
  },

  getNowWIBAsDateTime(): DateTime {
    return DateTime.now().setZone(ZONE);
  },

  getTimeTodayWIB(hour: number, minute = 0, second = 0): DateTime {
    return DateTime.now().setZone(ZONE).set({
      hour,
      minute,
      second,
      millisecond: 0,
    });
  },

  isSunday(): boolean {
    const date = DateTime.now().setZone(ZONE);
    return date.weekday === 7;
  },

  // JS Date#getDay() semantics (0 = Sunday .. 6 = Saturday) but computed in
  // the Asia/Jakarta zone instead of the server's local timezone.
  getDayOfWeekWIB(date: Date): number {
    const weekday = DateTime.fromJSDate(date).setZone(ZONE).weekday; // 1 (Mon) .. 7 (Sun)
    return weekday % 7;
  },

  // Takes the WIB calendar day of `date` and sets the time-of-day to
  // `HH:mm`, e.g. to build "this record's day at the checkout deadline".
  combineDateAndTimeWIB(date: Date, hhmm: string): Date {
    const [hour, minute] = hhmm.split(":").map(Number);
    return DateTime.fromJSDate(date)
      .setZone(ZONE)
      .set({ hour, minute: minute || 0, second: 0, millisecond: 0 })
      .toJSDate();
  },

  getDate(date: Date): string {
    const isoDate = DateTime.fromJSDate(date).setZone(ZONE).toISODate();
    if (!isoDate) {
      throw new Error("Failed to convert date to ISO format");
    }
    return isoDate;
  },

  convertToIndonesiaTime(date: Date | null | undefined): Date | null {
    if (!date) return null;
    // Convert UTC to Indonesia time (UTC+7)
    const dt = DateTime.fromJSDate(date).setZone(ZONE);
    return dt.toJSDate();
  },

  formatToIndonesiaTimeISO(date: Date | null | undefined): string | null {
    if (!date) return null;
    const dt = DateTime.fromJSDate(date).setZone(ZONE);
    return dt.toISO();
  },

  // Merges an optional lower-bound cutoff into an existing $gte/$lte range,
  // taking the later of the two $gte values (so an existing narrower filter,
  // e.g. a specific month, is never widened past the cutoff). Returns the
  // range unchanged if there's no cutoff to apply.
  applyCutoffToRange(
    existing: { $gte?: Date; $lte?: Date } | null | undefined,
    cutoffDate?: Date | null
  ): { $gte?: Date; $lte?: Date } | undefined {
    if (!cutoffDate) return existing ?? undefined;
    const gte = existing?.$gte && existing.$gte > cutoffDate ? existing.$gte : cutoffDate;
    const merged: { $gte: Date; $lte?: Date } = { $gte: gte };
    if (existing?.$lte) merged.$lte = existing.$lte;
    return merged;
  },
};

export default dateHelper;
