import { useState } from 'react';
import type { DayOfWeekIndex, ScheduledClassDetail, StudentDetail } from '../types/models';
import { DAY_NAMES, formatDuration, formatHourLabel } from './format';

interface DetailsPanelProps {
  student?: StudentDetail;
  scheduledClassDetail?: ScheduledClassDetail;
  loading?: boolean;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
  hours?: number[];
  onMoveScheduledClass?: (entryId: string, dayOfWeek: DayOfWeekIndex, startTime: string) => void;
  onRemoveScheduledClass?: (entryId: string) => void;
}

const DAY_OPTIONS: DayOfWeekIndex[] = [1, 2, 3, 4, 5, 6, 0];

/** Renders student or scheduled-class-entry details as inline focus-pane content. */
export function DetailsPanel({
  student,
  scheduledClassDetail,
  loading,
  onRemoveEnrollment,
  hours,
  onMoveScheduledClass,
  onRemoveScheduledClass,
}: DetailsPanelProps) {
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedHour, setSelectedHour] = useState('');

  function buildStartTime(hour: string): string {
    return `${hour.padStart(2, '0')}:00:00`;
  }

  return (
    <div className="focus-panel">
      {loading && <p>Loading...</p>}

      {!loading && student && (
        <div>
          <h2>
            {student.firstName} {student.lastName}
          </h2>
          <dl>
            <dt>Email</dt>
            <dd>{student.email || '—'}</dd>
            <dt>Phone</dt>
            <dd>{student.phone || '—'}</dd>
            <dt>Notes</dt>
            <dd>{student.notes || '—'}</dd>
          </dl>
          <h3>Enrolled Classes</h3>
          {student.enrolledClasses.length === 0 && <p>Not enrolled in any classes.</p>}
          <ul>
            {student.enrolledClasses.map((c) => (
              <li key={c.id}>
                {c.name} ({c.enrollmentCount}/{c.maximumStudents})
                {onRemoveEnrollment && (
                  <button type="button" onClick={() => onRemoveEnrollment(student.id, c.id)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && scheduledClassDetail && (
        <div>
          <h2>{scheduledClassDetail.trainingClassName}</h2>
          <dl>
            <dt>Day</dt>
            <dd>{DAY_NAMES[scheduledClassDetail.dayOfWeek]}</dd>
            <dt>Start Time</dt>
            <dd>{scheduledClassDetail.startTime}</dd>
            <dt>Duration</dt>
            <dd>{formatDuration(scheduledClassDetail.duration)}</dd>
            <dt>Location</dt>
            <dd>{scheduledClassDetail.location || '—'}</dd>
          </dl>
          <h3>Enrolled Students</h3>
          {scheduledClassDetail.enrolledStudents.length === 0 && <p>No students enrolled.</p>}
          <ul>
            {scheduledClassDetail.enrolledStudents.map((s) => (
              <li key={s.id}>
                {s.firstName} {s.lastName}
              </li>
            ))}
          </ul>
          {onMoveScheduledClass && hours && (
            <div className="details-action">
              <label htmlFor="move-day-select">Move class</label>
              <select id="move-day-select" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                <option value="">Day…</option>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_NAMES[d]}
                  </option>
                ))}
              </select>
              <select id="move-hour-select" value={selectedHour} onChange={(e) => setSelectedHour(e.target.value)}>
                <option value="">Time…</option>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {formatHourLabel(h)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedDay || !selectedHour}
                onClick={() => {
                  onMoveScheduledClass(
                    scheduledClassDetail.id,
                    Number(selectedDay) as DayOfWeekIndex,
                    buildStartTime(selectedHour)
                  );
                  setSelectedDay('');
                  setSelectedHour('');
                }}
              >
                Move
              </button>
            </div>
          )}
          {onRemoveScheduledClass && (
            <div className="details-action">
              <button type="button" onClick={() => onRemoveScheduledClass(scheduledClassDetail.id)}>
                Remove from schedule
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
