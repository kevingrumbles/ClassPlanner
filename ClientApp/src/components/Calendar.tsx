import { useDraggable } from '@dnd-kit/core';
import type { CSSProperties } from 'react';
import type { ScheduleEntry } from '../types/models';
import { CalendarSlot } from './CalendarSlot';
import { formatDayLabel, formatTime, parseDurationMinutes } from './format';

const START_HOUR = 8;
const END_HOUR = 17; // 5 PM, exclusive of the slot after it
const HOUR_HEIGHT = 64;

interface CalendarProps {
  weekStart: Date;
  schedule: ScheduleEntry[];
  onSelectSchedule: (id: string) => void;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface ScheduledClassTileProps {
  entry: ScheduleEntry;
  top: number;
  height: number;
  onSelect: (id: string) => void;
}

function ScheduledClassTile({ entry, top, height, onSelect }: ScheduledClassTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `scheduled:${entry.id}`,
    data: { type: 'scheduled', scheduleId: entry.id },
  });

  const style: CSSProperties = {
    top,
    height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`scheduled-tile${isDragging ? ' is-dragging' : ''}`}
      onClick={() => onSelect(entry.id)}
    >
      <span className="tile-title">{entry.trainingClassName}</span>
      <span className="tile-subtitle">{formatTime(new Date(entry.startTime))}</span>
    </button>
  );
}

export function Calendar({ weekStart, schedule, onSelectSchedule }: CalendarProps) {
  const days = getWeekDays(weekStart);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="calendar-time-column-header" />
        {days.map((day) => (
          <div key={dayKey(day)} className="calendar-day-header">
            {formatDayLabel(day)}
          </div>
        ))}
      </div>
      <div className="calendar-body">
        <div className="calendar-time-column">
          {hours.map((hour) => (
            <div key={hour} className="calendar-time-label" style={{ height: HOUR_HEIGHT }}>
              {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayEntries = schedule.filter((s) => dayKey(new Date(s.startTime)) === dayKey(day));
          return (
            <div key={dayKey(day)} className="calendar-day-column">
              {hours.map((hour) => (
                <CalendarSlot key={hour} day={day} hour={hour} />
              ))}
              {dayEntries.map((entry) => {
                const start = new Date(entry.startTime);
                const startMinutesFromOpen = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                const durationMinutes = parseDurationMinutes(entry.duration);
                const top = (startMinutesFromOpen / 60) * HOUR_HEIGHT;
                const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24);
                return (
                  <ScheduledClassTile
                    key={entry.id}
                    entry={entry}
                    top={top}
                    height={height}
                    onSelect={onSelectSchedule}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
