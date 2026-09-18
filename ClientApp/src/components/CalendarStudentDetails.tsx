import type { ScheduledClassEntry, StudentSummary } from '../types/models';
import { DAY_NAMES, formatDateLabel, formatDuration, formatTimeOfDay } from './format';

interface CalendarStudentDetailsProps {
  student: StudentSummary;
  /** Every calendar entry for this student in the week currently displayed. */
  entries: ScheduledClassEntry[];
  /** Selects an entry, switching the focus pane to its details. */
  onSelectEntry?: (entryId: string) => void;
  /** Removes a one-time appointment. Classes and repeating appointments cannot be removed here. */
  onRemoveEntry?: (entryId: string) => void;
  /** Returns to the calendar grid. */
  onClose?: () => void;
}

function isOneTimeAppointment(entry: ScheduledClassEntry): boolean {
  return !entry.trainingClassId && Boolean(entry.studentId) && entry.recurrenceType === 'Once';
}

function entrySortKey(entry: ScheduledClassEntry): string {
  return `${entry.eventDate ?? ''}${entry.startTime}`;
}

/**
 * Focus-pane details for a student selected in Calendar View, listing the classes and
 * appointments scheduled for them in the week on screen. One-time appointments can be removed
 * directly; classes and repeating appointments are managed in the Schedule View.
 */
export function CalendarStudentDetails({
  student,
  entries,
  onSelectEntry,
  onRemoveEntry,
  onClose,
}: CalendarStudentDetailsProps) {
  const sorted = [...entries].sort((a, b) => entrySortKey(a).localeCompare(entrySortKey(b)));
  const classes = sorted.filter((e) => e.trainingClassId);
  const appointments = sorted.filter((e) => !e.trainingClassId);

  function renderEntry(entry: ScheduledClassEntry) {
    const when = entry.eventDate ? formatDateLabel(entry.eventDate) : DAY_NAMES[entry.dayOfWeek];
    return (
      <li key={entry.id}>
        <span
          className={onSelectEntry ? 'editable-text' : undefined}
          onClick={onSelectEntry ? () => onSelectEntry(entry.id) : undefined}
        >
          {entry.trainingClassName ?? entry.studentName}
          <span className="editable-text-placeholder">
            {' '}
            - {when} {formatTimeOfDay(entry.startTime)} ({formatDuration(entry.duration)})
          </span>
          {entry.isPending && <span className="calendar-entry-unsaved-label"> - unsaved</span>}
        </span>
        {isOneTimeAppointment(entry) && onRemoveEntry && (
          <button type="button" onClick={() => onRemoveEntry(entry.id)}>
            Remove
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="focus-panel">
      <div className="class-view-header">
        <h2>
          {student.firstName} {student.lastName}
        </h2>
        <div className="class-view-header-actions">
          {onClose && (
            <button type="button" onClick={onClose}>
              Back to Calendar
            </button>
          )}
        </div>
      </div>

      <p className="class-view-hint">Showing the classes and appointments in the week currently displayed.</p>

      <h3>Classes</h3>
      {classes.length === 0 && <p>No classes this week.</p>}
      <ul>{classes.map(renderEntry)}</ul>

      <h3>Appointments</h3>
      {appointments.length === 0 && <p>No appointments this week.</p>}
      <ul>{appointments.map(renderEntry)}</ul>
    </div>
  );
}
