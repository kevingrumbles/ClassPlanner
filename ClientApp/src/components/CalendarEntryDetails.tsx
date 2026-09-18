import type { ClassDetail, ScheduledClassEntry } from '../types/models';
import { EditableValue } from './EditableValue';
import { DAY_NAMES, formatDateLabel, formatDuration, formatTimeOfDay, parseDurationMinutes } from './format';

interface CalendarEntryDetailsProps {
  entry: ScheduledClassEntry;
  /**
   * The ClassPlanner class this entry represents, resolved from the class id carried on the
   * Google event. Only present for class entries whose class still exists.
   */
  classDetail?: ClassDetail;
  loading?: boolean;
  /**
   * Called when a property of an editable (one-time) appointment is committed. Not provided
   * for entries that cannot be changed from Calendar View.
   */
  onSave?: (entryId: string, eventDate: string, startTime: string, duration: string) => void;
  onRemove?: (entryId: string) => void;
  /** Returns to the calendar grid. */
  onClose?: () => void;
}

function startTimeToInputValue(startTime: string): string {
  const totalMinutes = parseDurationMinutes(startTime);
  const rounded = Math.round(totalMinutes / 15) * 15;
  const hours = Math.floor(rounded / 60) % 24;
  const minutes = rounded % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function minutesToDuration(minutes: number): string {
  const safeMinutes = Math.max(Math.round(minutes / 15) * 15, 15);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

/**
 * Focus-pane details for an entry selected in Calendar View.
 *
 * One-time appointments are editable here, whether or not they have been uploaded to Google
 * Calendar yet: each property is click-to-edit and saves as soon as it is committed. Classes
 * and repeating appointments are shown read-only because they belong to a ClassPlanner
 * schedule and must be edited from the Schedule View so the whole series stays consistent.
 */
export function CalendarEntryDetails({
  entry,
  classDetail,
  loading,
  onSave,
  onRemove,
  onClose,
}: CalendarEntryDetailsProps) {
  const isClass = Boolean(entry.trainingClassId) || !entry.studentId;
  const isRepeating = entry.recurrenceType !== 'Once';
  const isOneTimeAppointment = !isClass && !isRepeating;
  const isEditable = Boolean(onSave) && isOneTimeAppointment;

  const eventDate = entry.eventDate ?? '';
  const startTimeValue = startTimeToInputValue(entry.startTime);
  const durationMinutes = Math.round(parseDurationMinutes(entry.duration) / 15) * 15;

  const title = classDetail?.name ?? entry.trainingClassName ?? entry.studentName ?? 'Calendar entry';

  const readOnlyReason = isClass
    ? 'Classes are managed in the Schedule View and cannot be changed here.'
    : isRepeating
      ? 'Repeating appointments are managed in the Schedule View and cannot be changed here.'
      : null;

  /** Commits a single changed property, carrying the other values through unchanged. */
  function save(next: { eventDate?: string; startTime?: string; duration?: string }) {
    onSave?.(
      entry.id,
      next.eventDate ?? eventDate,
      next.startTime ?? entry.startTime,
      next.duration ?? entry.duration
    );
  }

  return (
    <div className="focus-panel">
      <div className="class-view-header">
        <h2>{title}</h2>
        <div className="class-view-header-actions">
          {onClose && (
            <button type="button" onClick={onClose}>
              Back to Calendar
            </button>
          )}
        </div>
      </div>

      {readOnlyReason && <p className="class-view-hint">{readOnlyReason}</p>}
      {isEditable && <p className="class-view-hint">Click any value below to edit it.</p>}

      <dl>
        <dt>Type</dt>
        <dd>{isClass ? 'Class' : isRepeating ? 'Repeating appointment' : 'One-time appointment'}</dd>

        <dt>Date</dt>
        <dd>
          <EditableValue
            type="date"
            editable={isEditable && Boolean(eventDate)}
            display={eventDate ? formatDateLabel(eventDate) : DAY_NAMES[entry.dayOfWeek]}
            value={eventDate}
            onCommit={(value) => save({ eventDate: value })}
          />
        </dd>

        <dt>Start Time</dt>
        <dd>
          <EditableValue
            type="time"
            editable={isEditable}
            step={900}
            display={formatTimeOfDay(entry.startTime)}
            value={startTimeValue}
            onCommit={(value) => save({ startTime: `${value}:00` })}
          />
        </dd>

        <dt>Duration (minutes)</dt>
        <dd>
          <EditableValue
            type="number"
            editable={isEditable}
            min={15}
            step={15}
            display={formatDuration(entry.duration)}
            value={String(durationMinutes)}
            onCommit={(value) => save({ duration: minutesToDuration(Number(value)) })}
          />
        </dd>

        {entry.location && (
          <>
            <dt>Location</dt>
            <dd>{entry.location}</dd>
          </>
        )}

        {classDetail?.description && (
          <>
            <dt>Description</dt>
            <dd>{classDetail.description}</dd>
          </>
        )}

        {classDetail?.notes && (
          <>
            <dt>Notes</dt>
            <dd>{classDetail.notes}</dd>
          </>
        )}

        {classDetail && (
          <>
            <dt>Enrolled</dt>
            <dd>
              {classDetail.enrollmentCount} {classDetail.enrollmentCount === 1 ? 'student' : 'students'}
            </dd>
          </>
        )}

        {!classDetail && entry.enrollmentCount != null && (
          <>
            <dt>Enrolled</dt>
            <dd>
              {entry.enrollmentCount} {entry.enrollmentCount === 1 ? 'student' : 'students'}
            </dd>
          </>
        )}

        <dt>Status</dt>
        <dd>
          {entry.isPending ? (
            <span className="calendar-entry-unsaved-label">Unsaved - not yet uploaded to Google Calendar</span>
          ) : (
            'On Google Calendar'
          )}
        </dd>
      </dl>

      {isClass && loading && <p>Loading class details...</p>}

      {classDetail && (
        <>
          <h3>Enrolled Students</h3>
          {classDetail.enrolledStudents.length === 0 && <p>No students enrolled.</p>}
          <ul>
            {classDetail.enrolledStudents.map((s) => (
              <li key={s.id}>
                {s.firstName} {s.lastName}
              </li>
            ))}
          </ul>
        </>
      )}

      {isOneTimeAppointment && onRemove && (
        <div className="details-action">
          <button type="button" onClick={() => onRemove(entry.id)}>
            Remove appointment
          </button>
        </div>
      )}
    </div>
  );
}
