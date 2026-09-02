import { useDraggable } from '@dnd-kit/core';
import type { ScheduledClassEntry } from '../types/models';
import { CalendarSlot } from './CalendarSlot';
import { DAY_NAMES, formatDuration, formatHourLabel, parseDurationMinutes } from './format';

interface CalendarProps {
  entries: ScheduledClassEntry[];
  hours: number[];
  onSelectEntry: (entryId: string) => void;
  scheduleName?: string;
  onDeleteSchedule?: () => void;
}

interface DraggableEntryProps {
  entry: ScheduledClassEntry;
  onSelectEntry: (entryId: string) => void;
}

function DraggableEntry({ entry, onSelectEntry }: DraggableEntryProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `scheduled:${entry.id}`,
    data: { type: 'scheduled', entryId: entry.id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const startMinutes = parseDurationMinutes(entry.startTime);
  const minuteWithinHour = startMinutes % 60;
  const durationMinutes = parseDurationMinutes(entry.duration);
  const heightPercent = Math.max((durationMinutes / 60) * 100, 20);
  const isCompact = durationMinutes <= 15;
  const showEnrollment = durationMinutes >= 45 && entry.enrollmentCount != null;
  const showDuration = durationMinutes >= 60;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{ ...style, top: `${(minuteWithinHour / 60) * 100}%`, height: `${heightPercent}%` }}
      className={`tile calendar-entry${isDragging ? ' is-dragging' : ''}${entry.studentId ? ' calendar-entry-student' : ''}${isCompact ? ' calendar-entry-compact' : ''}`}
      onClick={() => onSelectEntry(entry.id)}
      {...listeners}
      {...attributes}
    >
      <span className="calendar-entry-name">{entry.trainingClassName ?? entry.studentName}</span>
      {showEnrollment && (
        <span className="calendar-entry-meta">
          {entry.enrollmentCount} {entry.enrollmentCount === 1 ? 'student' : 'students'}
        </span>
      )}
      {showDuration && <span className="calendar-entry-meta">{formatDuration(entry.duration)}</span>}
    </button>
  );
}

const QUARTER_MINUTES = [0, 15, 30, 45] as const;

/** Renders a Monday-Sunday weekly schedule grid with no specific dates, only day-of-week + time-of-day placement. */
export function Calendar({ entries, hours, onSelectEntry, scheduleName, onDeleteSchedule }: CalendarProps) {
  // Display order Monday(1) .. Sunday(0), matching typical weekly schedule conventions.
  const orderedDays = [1, 2, 3, 4, 5, 6, 0] as const;

  function entriesFor(dayOfWeek: number, hour: number) {
    return entries.filter((e) => {
      if (e.dayOfWeek !== dayOfWeek) return false;
      const startMinutes = parseDurationMinutes(e.startTime);
      const startHour = Math.floor(startMinutes / 60);
      return startHour === hour;
    });
  }

  return (
    <div className="calendar">
      {(scheduleName || onDeleteSchedule) && (
        <div className="calendar-toolbar">
          {scheduleName && <span className="calendar-toolbar-title">{scheduleName}</span>}
          {onDeleteSchedule && (
            <button type="button" className="calendar-delete-schedule" onClick={onDeleteSchedule}>
              Delete Schedule
            </button>
          )}
        </div>
      )}
      <div className="calendar-grid" style={{ gridTemplateColumns: `auto repeat(${orderedDays.length}, 1fr)` }}>
        <div className="calendar-corner" />
        {orderedDays.map((day) => (
          <div key={day} className="calendar-day-header">
            {DAY_NAMES[day]}
          </div>
        ))}

        {hours.map((hour) => (
          <div key={hour} className="calendar-row" style={{ display: 'contents' }}>
            <div className="calendar-hour-label">{formatHourLabel(hour)}</div>
            {orderedDays.map((day) => (
              <div key={`${day}-${hour}`} className="calendar-cell">
                {QUARTER_MINUTES.map((minute) => (
                  <CalendarSlot key={minute} dayOfWeek={day} hour={hour} minute={minute} />
                ))}
                {entriesFor(day, hour).map((entry) => (
                  <DraggableEntry key={entry.id} entry={entry} onSelectEntry={onSelectEntry} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
