import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { getShiftForDay, getNextShiftStart, getShiftEndTime, calculateEndDateWithShifts } from './date-utils.js';
import type { Shift } from '../reflow/types.js';

const STANDARD_SHIFTS: Shift[] = [
  { dayOfWeek: 1, startHour: 8, endHour: 17 },
  { dayOfWeek: 2, startHour: 8, endHour: 17 },
  { dayOfWeek: 3, startHour: 8, endHour: 17 },
  { dayOfWeek: 4, startHour: 8, endHour: 17 },
  { dayOfWeek: 5, startHour: 8, endHour: 17 },
];

describe('getShiftForDay', () => {
  it('returns shift for Wednesday', () => {
    const shift = getShiftForDay(3, STANDARD_SHIFTS);
    expect(shift).toEqual({ dayOfWeek: 3, startHour: 8, endHour: 17 });
  });

  it('returns null for Sunday', () => {
    expect(getShiftForDay(0, STANDARD_SHIFTS)).toBeNull();
  });
});

describe('getNextShiftStart', () => {
  it('returns same time if within shift', () => {
    const mon9am = DateTime.fromISO('2026-01-19T09:00:00Z');
    const result = getNextShiftStart(mon9am, STANDARD_SHIFTS);
    expect(result.toMillis()).toBe(mon9am.toMillis());
  });

  it('jumps to shift start if original start is before before shift', () => {
    const mon6am = DateTime.fromISO('2026-01-19T06:00:00Z');
    const mon8am = DateTime.fromISO('2026-01-19T08:00:00Z');
    const result = getNextShiftStart(mon6am, STANDARD_SHIFTS);
    expect(result.toMillis()).toBe(mon8am.toMillis());
  });

  it('jumps to next day if starts after shift ends', () => {
    const mon6pm = DateTime.fromISO('2026-01-19T18:00:00Z');
    const tue8am = DateTime.fromISO('2026-01-20T08:00:00Z');
    const result = getNextShiftStart(mon6pm, STANDARD_SHIFTS);
    expect(result.toMillis()).toBe(tue8am.toMillis());
  });

  it('skips if it starts sometime over the weekend', () => {
    const fri6pm = DateTime.fromISO('2026-01-23T18:00:00Z');
    const mon8am = DateTime.fromISO('2026-01-26T08:00:00Z');
    const result = getNextShiftStart(fri6pm, STANDARD_SHIFTS);
    expect(result.toMillis()).toBe(mon8am.toMillis());
  });

  it('handles Sunday correctly (e.g. Luxon weekday 7, JS day 0)', () => {
    const sun8am = DateTime.fromISO('2026-01-25T08:00:00Z');
    expect(sun8am.weekday).toBe(7);
    const mon8am = DateTime.fromISO('2026-01-26T08:00:00Z');
    const result = getNextShiftStart(sun8am, STANDARD_SHIFTS);
    expect(result.toMillis()).toBe(mon8am.toMillis());
  });
});

describe('getShiftEndTime', () => {
  it('returns shift end hour on same day', () => {
    const mon9am = DateTime.fromISO('2026-01-19T09:00:00Z');
    const mon5pm = DateTime.fromISO('2026-01-19T17:00:00Z');
    const shift = { dayOfWeek: 1, startHour: 8, endHour: 17 };
    const result = getShiftEndTime(mon9am, shift);
    expect(result.toMillis()).toBe(mon5pm.toMillis());
  });
});

describe('calculateEndDateWithShifts', () => {
  it('60 min ends within same shift', () => {
    const mon8am = DateTime.fromISO('2026-01-19T08:00:00Z');
    const mon9am = DateTime.fromISO('2026-01-19T09:00:00Z');
    const result = calculateEndDateWithShifts(mon8am, 60, STANDARD_SHIFTS);
    expect(result.toMillis()).toBe(mon9am.toMillis());
  });

  it('120 min duration pushed end to overnight', () => {
    const mon4pm = DateTime.fromISO('2026-01-19T16:00:00Z');
    const tue9am = DateTime.fromISO('2026-01-20T09:00:00Z');
    const result = calculateEndDateWithShifts(mon4pm, 120, STANDARD_SHIFTS);
    expect(result.toMillis()).toBe(tue9am.toMillis());
  });

  it('120 min duration pushed end over the weekend', () => {
    const fri4pm = DateTime.fromISO('2026-01-23T16:00:00Z');
    const mon9am = DateTime.fromISO('2026-01-26T09:00:00Z');
    const result = calculateEndDateWithShifts(fri4pm, 120, STANDARD_SHIFTS);
    expect(result.toMillis()).toBe(mon9am.toMillis());
  });
});
