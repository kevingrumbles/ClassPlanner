import { useState } from 'react';
import type { ClassDetail, ClassSummary, ScheduleDetail, StudentDetail, StudentSummary } from '../types/models';
import { formatDuration, formatTime } from './format';

interface DetailsPanelProps {
  onClose: () => void;
  student?: StudentDetail;
  trainingClass?: ClassDetail;
  scheduleDetail?: ScheduleDetail;
  loading?: boolean;
  allClasses?: ClassSummary[];
  allStudents?: StudentSummary[];
  onEnroll?: (studentId: string, classId: string) => void;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
  weekDays?: Date[];
  hours?: number[];
  onScheduleClass?: (classId: string, startTime: string) => void;
  onMoveSchedule?: (scheduleId: string, startTime: string) => void;
  onRemoveSchedule?: (scheduleId: string) => void;
}

export function DetailsPanel({
  onClose,
  student,
  trainingClass,
  scheduleDetail,
  loading,
  allClasses,
  allStudents,
  onEnroll,
  onRemoveEnrollment,
  weekDays,
  hours,
  onScheduleClass,
  onMoveSchedule,
  onRemoveSchedule,
}: DetailsPanelProps) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedHour, setSelectedHour] = useState('');

  const availableClassesForStudent = (allClasses ?? []).filter(
    (c) => !student?.enrolledClasses.some((ec) => ec.id === c.id)
  );
  const availableStudentsForClass = (allStudents ?? []).filter(
    (s) => !trainingClass?.enrolledStudents.some((es) => es.id === s.id)
  );

  return (
    <aside className="details-panel" role="dialog" aria-label="Details">
      <button type="button" className="details-close" onClick={onClose} aria-label="Close details">
        ×
      </button>

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
          {onEnroll && availableClassesForStudent.length > 0 && (
            <div className="details-action">
              <label htmlFor="enroll-class-select">Enroll in class</label>
              <select
                id="enroll-class-select"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">Select a class…</option>
                {availableClassesForStudent.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedClassId}
                onClick={() => {
                  onEnroll(student.id, selectedClassId);
                  setSelectedClassId('');
                }}
              >
                Enroll
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && trainingClass && (
        <div>
          <h2>{trainingClass.name}</h2>
          <dl>
            <dt>Description</dt>
            <dd>{trainingClass.description || '—'}</dd>
            <dt>Capacity</dt>
            <dd>
              {trainingClass.enrollmentCount} / {trainingClass.maximumStudents}
            </dd>
            <dt>Duration</dt>
            <dd>{formatDuration(trainingClass.duration)}</dd>
            <dt>Location</dt>
            <dd>{trainingClass.location || '—'}</dd>
            <dt>Notes</dt>
            <dd>{trainingClass.notes || '—'}</dd>
          </dl>
          <h3>Enrolled Students</h3>
          {trainingClass.enrolledStudents.length === 0 && <p>No students enrolled.</p>}
          <ul>
            {trainingClass.enrolledStudents.map((s) => (
              <li key={s.id}>
                {s.firstName} {s.lastName}
                {onRemoveEnrollment && (
                  <button type="button" onClick={() => onRemoveEnrollment(s.id, trainingClass.id)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {onEnroll && availableStudentsForClass.length > 0 && (
            <div className="details-action">
              <label htmlFor="add-student-select">Add student</label>
              <select
                id="add-student-select"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">Select a student…</option>
                {availableStudentsForClass.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedStudentId}
                onClick={() => {
                  onEnroll(selectedStudentId, trainingClass.id);
                  setSelectedStudentId('');
                }}
              >
                Add
              </button>
            </div>
          )}
          {onScheduleClass && weekDays && hours && (
            <div className="details-action">
              <label htmlFor="schedule-day-select">Schedule class</label>
              <select id="schedule-day-select" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                <option value="">Day…</option>
                {weekDays.map((d) => (
                  <option key={d.toISOString()} value={d.toISOString()}>
                    {d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </option>
                ))}
              </select>
              <select id="schedule-hour-select" value={selectedHour} onChange={(e) => setSelectedHour(e.target.value)}>
                <option value="">Time…</option>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedDay || !selectedHour}
                onClick={() => {
                  const start = new Date(selectedDay);
                  start.setHours(Number(selectedHour), 0, 0, 0);
                  onScheduleClass(trainingClass.id, start.toISOString());
                  setSelectedDay('');
                  setSelectedHour('');
                }}
              >
                Schedule
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && scheduleDetail && (
        <div>
          <h2>{scheduleDetail.trainingClassName}</h2>
          <dl>
            <dt>Date</dt>
            <dd>{new Date(scheduleDetail.startTime).toLocaleDateString()}</dd>
            <dt>Start Time</dt>
            <dd>{formatTime(new Date(scheduleDetail.startTime))}</dd>
            <dt>Duration</dt>
            <dd>{formatDuration(scheduleDetail.duration)}</dd>
            <dt>Location</dt>
            <dd>{scheduleDetail.location || '—'}</dd>
          </dl>
          <h3>Enrolled Students</h3>
          {scheduleDetail.enrolledStudents.length === 0 && <p>No students enrolled.</p>}
          <ul>
            {scheduleDetail.enrolledStudents.map((s) => (
              <li key={s.id}>
                {s.firstName} {s.lastName}
              </li>
            ))}
          </ul>
          {onMoveSchedule && weekDays && hours && (
            <div className="details-action">
              <label htmlFor="move-day-select">Move class</label>
              <select id="move-day-select" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                <option value="">Day…</option>
                {weekDays.map((d) => (
                  <option key={d.toISOString()} value={d.toISOString()}>
                    {d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </option>
                ))}
              </select>
              <select id="move-hour-select" value={selectedHour} onChange={(e) => setSelectedHour(e.target.value)}>
                <option value="">Time…</option>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedDay || !selectedHour}
                onClick={() => {
                  const start = new Date(selectedDay);
                  start.setHours(Number(selectedHour), 0, 0, 0);
                  onMoveSchedule(scheduleDetail.id, start.toISOString());
                  setSelectedDay('');
                  setSelectedHour('');
                }}
              >
                Move
              </button>
            </div>
          )}
          {onRemoveSchedule && (
            <div className="details-action">
              <button type="button" onClick={() => onRemoveSchedule(scheduleDetail.id)}>
                Remove from schedule
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
