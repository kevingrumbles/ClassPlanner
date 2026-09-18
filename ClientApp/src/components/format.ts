/** Parses a .NET TimeSpan string (e.g. "01:30:00" or "1.02:00:00") into total minutes. */
export function parseDurationMinutes(duration: string): number {
  const dayMatch = duration.match(/^(\d+)\.(.*)$/);
  const days = dayMatch ? Number(dayMatch[1]) : 0;
  const timePart = dayMatch ? dayMatch[2] : duration;
  const [hours, minutes] = timePart.split(':').map(Number);
  return days * 24 * 60 + (hours || 0) * 60 + (minutes || 0);
}

export function formatDuration(duration: string): string {
  const totalMinutes = parseDurationMinutes(duration);
  if (totalMinutes % 60 === 0) {
    const hours = totalMinutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${totalMinutes} minutes`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Day names indexed to match .NET's DayOfWeek (0 = Sunday ... 6 = Saturday). */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Formats an hour-of-day (0-23) as a short label, e.g. "9 AM" or "1 PM". */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

/** Formats a .NET TimeSpan string ("hh:mm:ss") as a time-of-day label, e.g. "9:00 AM". */
export function formatTimeOfDay(timeSpan: string): string {
  const totalMinutes = parseDurationMinutes(timeSpan);
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/** Returns the Sunday on/before the given ISO date string ("yyyy-MM-dd"). */
export function startOfWeek(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // getDay() is 0 for Sunday, so subtracting it always lands on the week's Sunday.
  date.setDate(date.getDate() - date.getDay());
  return toIsoDate(date);
}

/** Adds the given number of days to an ISO date string ("yyyy-MM-dd"). */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Formats a Date as an ISO "yyyy-MM-dd" string using local time components. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formats an ISO date string ("yyyy-MM-dd") as a short label, e.g. "Jan 5, 2025". */
export function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
