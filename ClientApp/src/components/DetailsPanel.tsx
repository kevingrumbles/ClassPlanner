import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { DayOfWeekIndex, ScheduledClassDetail, StudentDetail } from '../types/models';
import { DAY_NAMES, parseDurationMinutes } from './format';

interface DetailsPanelProps {
  student?: StudentDetail;
  scheduledClassDetail?: ScheduledClassDetail;
  loading?: boolean;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
  onDeleteStudent?: (studentId: string) => void;
  onSaveStudent?: (studentId: string, email: string | null, phone: string | null, notes: string | null) => void;
  onRemoveScheduledClass?: (entryId: string) => void;
  onSaveScheduledClass?: (
    entryId: string,
    dayOfWeek: DayOfWeekIndex,
    startTime: string,
    duration: string,
    location: string | null
  ) => void;
  onSaveClass?: (classId: string, description: string | null, notes: string | null) => void;
}

const DAY_OPTIONS: DayOfWeekIndex[] = [0, 1, 2, 3, 4, 5, 6];

function startTimeToInputValue(startTime: string): string {
  const totalMinutes = parseDurationMinutes(startTime);
  const rounded = Math.round(totalMinutes / 15) * 15;
  const hours = Math.floor(rounded / 60) % 24;
  const minutes = rounded % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function inputValueToStartTime(value: string): string {
  return `${value}:00`;
}

function durationToInputMinutes(duration: string): number {
  const totalMinutes = parseDurationMinutes(duration);
  return Math.round(totalMinutes / 15) * 15;
}

function minutesToDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

/** Renders student or scheduled-class-entry details as inline focus-pane content. */
export function DetailsPanel({
  student,
  scheduledClassDetail,
  loading,
  onRemoveEnrollment,
  onDeleteStudent,
  onSaveStudent,
  onRemoveScheduledClass,
  onSaveScheduledClass,
  onSaveClass,
}: DetailsPanelProps) {
  return (
    <div className="focus-panel">
      {loading && <p>Loading...</p>}

      {!loading && student && (
        <StudentFields
          key={student.id}
          student={student}
          onRemoveEnrollment={onRemoveEnrollment}
          onDeleteStudent={onDeleteStudent}
          onSaveStudent={onSaveStudent}
        />
      )}

      {!loading && scheduledClassDetail && (
        <ScheduledClassFields
          key={scheduledClassDetail.id}
          scheduledClassDetail={scheduledClassDetail}
          onRemoveScheduledClass={onRemoveScheduledClass}
          onSaveScheduledClass={onSaveScheduledClass}
          onRemoveEnrollment={onRemoveEnrollment}
          onSaveClass={onSaveClass}
        />
      )}
    </div>
  );
}

interface StudentFieldsProps {
  student: StudentDetail;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
  onDeleteStudent?: (studentId: string) => void;
  onSaveStudent?: (studentId: string, email: string | null, phone: string | null, notes: string | null) => void;
}

function StudentFields({ student, onRemoveEnrollment, onDeleteStudent, onSaveStudent }: StudentFieldsProps) {
  const [email, setEmail] = useState(student.email ?? '');
  const [phone, setPhone] = useState(student.phone ?? '');
  const [notes, setNotes] = useState(student.notes ?? '');

  const isDirty =
    email !== (student.email ?? '') || phone !== (student.phone ?? '') || notes !== (student.notes ?? '');

  return (
    <div>
      <div className="class-view-header">
        <h2>
          {student.firstName} {student.lastName}
        </h2>
        <div className="class-view-header-actions">
          {isDirty && onSaveStudent && (
            <button
              type="button"
              className="class-view-save"
              onClick={() => onSaveStudent(student.id, email || null, phone || null, notes || null)}
            >
              Save Changes
            </button>
          )}
          {onDeleteStudent && (
            <button
              type="button"
              className="details-delete-button"
              onClick={() => onDeleteStudent(student.id)}
            >
              Delete Student
            </button>
          )}
        </div>
      </div>
      <dl>
        <dt>Email</dt>
        <dd>
          <input type="text" className="class-view-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </dd>
        <dt>Phone</dt>
        <dd>
          <input type="text" className="class-view-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </dd>
        <dt>Notes</dt>
        <dd>
          <textarea
            className="class-view-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </dd>
      </dl>
      <h3>Enrolled Classes</h3>
      {student.enrolledClasses.length === 0 && <p>Not enrolled in any classes.</p>}
      <ul>
        {student.enrolledClasses.map((c) => (
          <li key={c.id}>
            {c.name} ({c.enrollmentCount} {c.enrollmentCount === 1 ? 'student' : 'students'})
            {onRemoveEnrollment && (
              <button type="button" onClick={() => onRemoveEnrollment(student.id, c.id)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ScheduledClassFieldsProps {
  scheduledClassDetail: ScheduledClassDetail;
  onRemoveScheduledClass?: (entryId: string) => void;
  onSaveScheduledClass?: (
    entryId: string,
    dayOfWeek: DayOfWeekIndex,
    startTime: string,
    duration: string,
    location: string | null
  ) => void;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
  onSaveClass?: (classId: string, description: string | null, notes: string | null) => void;
}

function ScheduledClassFields({
  scheduledClassDetail,
  onRemoveScheduledClass,
  onSaveScheduledClass,
  onRemoveEnrollment,
  onSaveClass,
}: ScheduledClassFieldsProps) {
  const [dayOfWeek, setDayOfWeek] = useState(scheduledClassDetail.dayOfWeek);
  const [startTime, setStartTime] = useState(startTimeToInputValue(scheduledClassDetail.startTime));
  const [durationMinutes, setDurationMinutes] = useState(durationToInputMinutes(scheduledClassDetail.duration));
  const [location, setLocation] = useState(scheduledClassDetail.location ?? '');
  const [classDescription, setClassDescription] = useState(scheduledClassDetail.classDescription ?? '');
  const [classNotes, setClassNotes] = useState(scheduledClassDetail.classNotes ?? '');

  const isDirty =
    dayOfWeek !== scheduledClassDetail.dayOfWeek ||
    startTime !== startTimeToInputValue(scheduledClassDetail.startTime) ||
    durationMinutes !== durationToInputMinutes(scheduledClassDetail.duration) ||
    location !== (scheduledClassDetail.location ?? '') ||
    classDescription !== (scheduledClassDetail.classDescription ?? '') ||
    classNotes !== (scheduledClassDetail.classNotes ?? '');

  const { setNodeRef, isOver, active } = useDroppable({
    id: `scheduled-class-view:${scheduledClassDetail.id}`,
    data: { type: 'classView', classId: scheduledClassDetail.trainingClassId },
  });

  const isStudentDragActive = active?.data.current?.type === 'student';
  const isDropReady = !scheduledClassDetail.studentId && isOver && isStudentDragActive;

  return (
    <div>
      <h2>
        {scheduledClassDetail.studentId
          ? `${scheduledClassDetail.studentName} (Appointment)`
          : scheduledClassDetail.trainingClassName}
      </h2>
      {isDirty && (onSaveScheduledClass || onSaveClass) && (
        <button
          type="button"
          className="class-view-save"
          onClick={() => {
            if (
              onSaveScheduledClass &&
              (dayOfWeek !== scheduledClassDetail.dayOfWeek ||
                startTime !== startTimeToInputValue(scheduledClassDetail.startTime) ||
                durationMinutes !== durationToInputMinutes(scheduledClassDetail.duration) ||
                location !== (scheduledClassDetail.location ?? ''))
            ) {
              onSaveScheduledClass(
                scheduledClassDetail.id,
                dayOfWeek,
                inputValueToStartTime(startTime),
                minutesToDuration(durationMinutes),
                location || null
              );
            }
            if (
              onSaveClass &&
              scheduledClassDetail.trainingClassId &&
              (classDescription !== (scheduledClassDetail.classDescription ?? '') ||
                classNotes !== (scheduledClassDetail.classNotes ?? ''))
            ) {
              onSaveClass(scheduledClassDetail.trainingClassId, classDescription || null, classNotes || null);
            }
          }}
        >
          Save Changes
        </button>
      )}
      <dl>
        <dt>Day</dt>
        <dd>
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value) as DayOfWeekIndex)}>
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]}
              </option>
            ))}
          </select>
        </dd>
        <dt>Start Time</dt>
        <dd>
          <input type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </dd>
        <dt>Duration (minutes)</dt>
        <dd>
          <input
            type="number"
            min={15}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Math.round(Number(e.target.value) / 15) * 15)}
          />
        </dd>
        <dt>Location</dt>
        <dd>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </dd>
        {!scheduledClassDetail.studentId && (
          <>
            <dt>Description</dt>
            <dd>
              <textarea
                className="class-view-textarea"
                value={classDescription}
                onChange={(e) => setClassDescription(e.target.value)}
                rows={2}
              />
            </dd>
            <dt>Notes</dt>
            <dd>
              <textarea
                className="class-view-textarea"
                value={classNotes}
                onChange={(e) => setClassNotes(e.target.value)}
                rows={2}
              />
            </dd>
          </>
        )}
      </dl>
      {!scheduledClassDetail.studentId && (
        <div ref={setNodeRef} className={`class-view-members-drop${isDropReady ? ' is-drop-ready' : ''}`}>
          <h3>Enrolled Students</h3>
          <p className="class-view-hint">Drag a student here to enroll them in this class.</p>
          {scheduledClassDetail.enrolledStudents.length === 0 && <p>No students enrolled.</p>}
          <ul>
            {scheduledClassDetail.enrolledStudents.map((s) => (
              <li key={s.id}>
                {s.firstName} {s.lastName}
                {onRemoveEnrollment && scheduledClassDetail.trainingClassId && (
                  <button
                    type="button"
                    onClick={() => onRemoveEnrollment(s.id, scheduledClassDetail.trainingClassId!)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
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
  );
}
