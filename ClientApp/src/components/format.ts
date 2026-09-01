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

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
