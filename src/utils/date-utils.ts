import { DateTime } from 'luxon';
import type { Shift } from '../reflow/types.js';

const MS_PER_MINUTE = 60000;

export function getShiftForDay(
  dayOfWeek: number,
  shifts: Shift[]
): Shift | null {
  return shifts.find((s) => s.dayOfWeek === dayOfWeek) ?? null;
}

export function getNextShiftStart(time: DateTime, shifts: Shift[]): DateTime {
  const utcTime = time.toUTC();

  // Luxon: 7=Sun so need this to convert
  const toDayOfWeek = (dt: DateTime) => (dt.weekday === 7 ? 0 : dt.weekday);

  const todayShift = getShiftForDay(toDayOfWeek(utcTime), shifts);
  if (todayShift) {
    const hour = utcTime.hour;

    if (hour >= todayShift.startHour && hour < todayShift.endHour) {
      // means that is "within" the workCenter shift already
      return utcTime;
    }

    // means that its before, so need to bump shift back to within workCenter shift
    if (hour < todayShift.startHour) {
      return utcTime.set({ hour: todayShift.startHour, minute: 0, second: 0, millisecond: 0 });
    }
  }

  // Finds the next workCenter shift, going day-by-day, then sets to start of that shift
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDay = utcTime.plus({ days: daysAhead });
    const shift = getShiftForDay(toDayOfWeek(futureDay), shifts);

    if (shift) {
      return futureDay.set({ hour: shift.startHour, minute: 0, second: 0, millisecond: 0 });
    }
  }

  throw new Error('workCenter has no shifts for any day of the week');
}

export function getShiftEndTime(time: DateTime, shift: Shift): DateTime {
  const utcTime = time.toUTC();
  return utcTime.set({ hour: shift.endHour, minute: 0, second: 0, millisecond: 0 });
}

export function calculateEndDateWithShifts(
  start: DateTime,
  durationMinutes: number,
  shifts: Shift[]
): DateTime {
  const toDayOfWeek = (dt: DateTime) => (dt.weekday === 7 ? 0 : dt.weekday);

  let remainingMinsInWorkOrder = durationMinutes;
  let current = start.toUTC();

  while (remainingMinsInWorkOrder) {
    const shift = getShiftForDay(toDayOfWeek(current), shifts);
    if (!shift) {
      current = getNextShiftStart(current, shifts);
      continue;
    }

    const shiftEnd = getShiftEndTime(current, shift);
    const availableMinutes = (shiftEnd.toMillis() - current.toMillis()) / MS_PER_MINUTE;

    if (availableMinutes >= remainingMinsInWorkOrder) {
      return current.plus({ minutes: remainingMinsInWorkOrder });
    }

    remainingMinsInWorkOrder -= availableMinutes;
    current = getNextShiftStart(shiftEnd, shifts);
  }

  return current;
}
