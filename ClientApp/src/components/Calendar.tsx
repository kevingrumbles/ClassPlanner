import { useDraggable } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import type { ScheduledClassEntry } from '../types/models';
import { CalendarSlot } from './CalendarSlot';
import { addDays, DAY_NAMES, formatDateLabel, formatDuration, formatHourLabel, parseDurationMinutes, startOfWeek, toIsoDate } from './format';

interface CalendarProps {
  entries: ScheduledClassEntry[];
  hours: number[];
  onSelectEntry: (entryId: string) => void;
  scheduleId?: string;
  scheduleName?: string;
  startDate?: string | null;
  endDate?: string | null;
  onDeleteSchedule?: () => void;
  onSaveScheduleDates?: (startDate: string | null, endDate: string | null) => void;
  onRenameSchedule?: (name: string) => void;
  /** Anchor date for the displayed week, and a setter to navigate/select which week is shown. */
  viewDate?: string;
  onViewDateChange?: (date: string) => void;
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
export function Calendar({
  entries,
  hours,
  onSelectEntry,
  scheduleId,
  scheduleName,
  startDate,
  endDate,
  onDeleteSchedule,
  onSaveScheduleDates,
  onRenameSchedule,
  viewDate,
  onViewDateChange,
}: CalendarProps) {
  // Display order Monday(1) .. Sunday(0), matching typical weekly schedule conventions.
  const orderedDays = [1, 2, 3, 4, 5, 6, 0] as const;

  const [draftStartDate, setDraftStartDate] = useState(startDate ?? '');
  const [draftEndDate, setDraftEndDate] = useState(endDate ?? '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(scheduleName ?? '');

  const showDateNav = Boolean(onViewDateChange);
  const weekStart = showDateNav ? startOfWeek(viewDate ?? toIsoDate(new Date())) : null;
  const weekDates = weekStart ? orderedDays.map((_, index) => addDays(weekStart, index)) : null;

  // startDate/endDate arrive asynchronously after the schedule id is already active (the
  // detail fetch resolves later), so the initial useState seed above can miss them. Re-sync
  // the drafts whenever the schedule identity or its persisted dates change.
  useEffect(() => {
    setDraftStartDate(startDate ?? '');
    setDraftEndDate(endDate ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-sync only on schedule/date changes
  }, [scheduleId, startDate, endDate]);

  const isDirty = draftStartDate !== (startDate ?? '') || draftEndDate !== (endDate ?? '');

  function entriesFor(dayOfWeek: number, hour: number) {
    return entries.filter((e) => {
      if (e.dayOfWeek !== dayOfWeek) return false;
      const startMinutes = parseDurationMinutes(e.startTime);
      const startHour = Math.floor(startMinutes / 60);
      return startHour === hour;
    });
  }

  function startEditingName() {
    if (!onRenameSchedule) return;
    setDraftName(scheduleName ?? '');
    setIsEditingName(true);
  }

  function commitNameEdit() {
    setIsEditingName(false);
    const trimmed = draftName.trim();
    if (onRenameSchedule && trimmed && trimmed !== scheduleName) {
      onRenameSchedule(trimmed);
    }
  }

  function cancelNameEdit() {
    setIsEditingName(false);
    setDraftName(scheduleName ?? '');
  }

  function goToPreviousWeek() {
    if (weekStart && onViewDateChange) {
      onViewDateChange(addDays(weekStart, -7));
    }
  }

  function goToNextWeek() {
    if (weekStart && onViewDateChange) {
      onViewDateChange(addDays(weekStart, 7));
    }
  }

  function goToToday() {
    onViewDateChange?.(toIsoDate(new Date()));
  }

  return (
    <div className="calendar">
      {(scheduleName || onDeleteSchedule || onSaveScheduleDates) && (
        <div className="calendar-toolbar">
          {scheduleName && !isEditingName && (
            <span
              className={`calendar-toolbar-title${onRenameSchedule ? ' calendar-toolbar-title-editable' : ''}`}
              onClick={startEditingName}
            >
              {scheduleName}
            </span>
          )}
          {scheduleName && isEditingName && (
            <input
              type="text"
              className="calendar-toolbar-title-input"
              value={draftName}
              autoFocus
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitNameEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  cancelNameEdit();
                }
              }}
            />
          )}
          {onSaveScheduleDates && (
            <div className="calendar-toolbar-dates">
              <label className="calendar-toolbar-date-field">
                Start
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(e) => setDraftStartDate(e.target.value)}
                />
              </label>
              <label className="calendar-toolbar-date-field">
                End
                <input type="date" value={draftEndDate} onChange={(e) => setDraftEndDate(e.target.value)} />
              </label>
              {isDirty && (
                <button
                  type="button"
                  className="class-view-save"
                  onClick={() => onSaveScheduleDates(draftStartDate || null, draftEndDate || null)}
                >
                  Save Changes
                </button>
              )}
            </div>
          )}
          {onDeleteSchedule && (
            <button type="button" className="calendar-delete-schedule" onClick={onDeleteSchedule}>
              Delete Schedule
            </button>
          )}
        </div>
      )}
      {showDateNav && weekStart && (
        <div className="calendar-week-nav">
          <button type="button" onClick={goToPreviousWeek}>
            &larr; Previous Week
          </button>
          <span className="calendar-week-nav-label">
            {formatDateLabel(weekStart)} &ndash; {formatDateLabel(addDays(weekStart, 6))}
          </span>
          <button type="button" onClick={goToToday}>
            Today
          </button>
          <button type="button" onClick={goToNextWeek}>
            Next Week &rarr;
          </button>
          <label className="calendar-week-nav-date-field">
            Go to date
            <input
              type="date"
              value={viewDate ?? ''}
              onChange={(e) => e.target.value && onViewDateChange?.(e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="calendar-grid" style={{ gridTemplateColumns: `auto repeat(${orderedDays.length}, 1fr)` }}>
        <div className="calendar-corner" />
        {orderedDays.map((day, index) => (
          <div key={day} className="calendar-day-header">
            {DAY_NAMES[day]}
            {weekDates && <span className="calendar-day-header-date">{formatDateLabel(weekDates[index])}</span>}
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
