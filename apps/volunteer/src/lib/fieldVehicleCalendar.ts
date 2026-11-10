/**
 * Mock availability for the vehicle hour tags.
 * Replace these rules when the real booking days and times are pasted in.
 */

export const VEHICLE_BOOKING_MONTH = { year: 2026, month: 11 } as const;

export type VehicleTimeSlot = {
  id: string;
  startLabel: string;
  endLabel: string;
  available: boolean;
};

export type VehicleCalendarDay = {
  date: string | null;
  day: number | null;
};

const HOUR_STARTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;
const BLOCK_STARTS = [8, 12, 16] as const;

export function vehicleCalendarWeeks(year: number, month: number): VehicleCalendarDay[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: VehicleCalendarDay[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ date: null, day: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      day,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }

  const weeks: VehicleCalendarDay[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function vehicleMonthTitle(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function vehicleChoiceLabel(date: string, startLabel: string): string {
  const short = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return `${short}, ${startLabel}`;
}

export function vehicleDateLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function vehicleDaySlots(
  vehicleId: string,
  lengthId: string,
  date: string,
): VehicleTimeSlot[] {
  const starts = lengthId === 'hour-4' ? BLOCK_STARTS : HOUR_STARTS;
  const hours = lengthId === 'hour-4' ? 4 : 1;
  return starts.map((start) => ({
    id: `${date}-${start}`,
    startLabel: clockLabel(start),
    endLabel: clockLabel(start + hours),
    available: vehicleSlotOpen(vehicleId, lengthId, date, start),
  }));
}

export function vehicleDayHasOpening(vehicleId: string, lengthId: string, date: string): boolean {
  return vehicleDaySlots(vehicleId, lengthId, date).some((slot) => slot.available);
}

function vehicleSlotOpen(
  vehicleId: string,
  lengthId: string,
  date: string,
  startHour: number,
): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (day === 0) return false;

  if (lengthId === 'hour-4') {
    if (vehicleId === 'van') {
      if (startHour === 8) return day === 2 || day === 4 || day === 6;
      if (startHour === 12) return day === 1 || day === 3 || day === 5;
      return false;
    }
    if (startHour === 8) return day !== 4;
    if (startHour === 12) return false;
    return day === 5 || day === 6;
  }

  if (vehicleId === 'van') {
    if (day === 6) return startHour === 8 || startHour === 9;
    if (startHour <= 10) return true;
    return startHour === 15 && (day === 1 || day === 3);
  }

  if (day === 6) return startHour >= 9 && startHour <= 11;
  return day % 2 === 1
    ? [8, 9, 11, 14, 16].includes(startHour)
    : [10, 13, 15].includes(startHour);
}

function clockLabel(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}:00 ${suffix}`;
}
