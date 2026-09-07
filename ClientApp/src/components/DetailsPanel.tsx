import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { DayOfWeekIndex, ScheduledClassDetail, StudentDetail } from '../types/models';
import { DAY_NAMES, formatTimeOfDay, parseDurationMinutes } from './format';

interface DetailsPanelProps {
  student?: StudentDetail;
  scheduledClassDetail?: ScheduledClassDetail;
  loading?: boolean;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
  onDeleteStudent?: (studentId: string) => void;
  onSaveStudent?: (
    studentId: string,
    firstName: string,
    lastName: string,
    email: string | null,
    phone: string | null,
    emergencyContact: string | null,
    notes: string | null
  ) => void;
  onRemoveScheduledClass?: (entryId: string) => void;
  onSaveScheduledClass?: (
    entryId: string,
    dayOfWeek: DayOfWeekIndex,
    startTime: string,
    duration: string,
    location: string | null
  ) => void;
  onSaveClass?: (classId: string, name: string, description: string | null, notes: string | null) => void;
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
  onSaveStudent?: (
    studentId: string,
    firstName: string,
    lastName: string,
    email: string | null,
    phone: string | null,
    emergencyContact: string | null,
    notes: string | null
  ) => void;
}

function StudentFields({ student, onRemoveEnrollment, onDeleteStudent, onSaveStudent }: StudentFieldsProps) {
  const [fullName, setFullName] = useState(`${student.firstName} ${student.lastName}`.trim());
  const [email, setEmail] = useState(student.email ?? '');
  const [phone, setPhone] = useState(student.phone ?? '');
  const [emergencyContact, setEmergencyContact] = useState(student.emergencyContact ?? '');
  const [notes, setNotes] = useState(student.notes ?? '');

  function splitName(name: string): { firstName: string; lastName: string } {
    const trimmed = name.trim();
    const spaceIndex = trimmed.lastIndexOf(' ');
    if (spaceIndex === -1) {
      return { firstName: trimmed, lastName: '' };
    }
    return { firstName: trimmed.slice(0, spaceIndex), lastName: trimmed.slice(spaceIndex + 1) };
  }

  function commit(next: {
    fullName?: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
    notes?: string;
  }) {
    const nextFullName = next.fullName ?? fullName;
    const nextEmail = next.email ?? email;
    const nextPhone = next.phone ?? phone;
    const nextEmergencyContact = next.emergencyContact ?? emergencyContact;
    const nextNotes = next.notes ?? notes;
    const { firstName, lastName } = splitName(nextFullName);
    onSaveStudent?.(
      student.id,
      firstName,
      lastName,
      nextEmail || null,
      nextPhone || null,
      nextEmergencyContact || null,
      nextNotes || null
    );
  }

  return (
    <div>
      <div className="class-view-header">
        <h2>
          <EditableText
            value={fullName}
            placeholder="Student name"
            onChange={setFullName}
            onCommit={(value) => commit({ fullName: value })}
          />
        </h2>
        <div className="class-view-header-actions">
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
          <EditableText
            value={email}
            placeholder="—"
            onChange={setEmail}
            onCommit={(value) => commit({ email: value })}
          />
        </dd>
        <dt>Phone</dt>
        <dd>
          <EditableText
            value={phone}
            placeholder="—"
            onChange={setPhone}
            onCommit={(value) => commit({ phone: value })}
          />
        </dd>
        <dt>Emergency Contact</dt>
        <dd>
          <EditableText
            value={emergencyContact}
            placeholder="—"
            onChange={setEmergencyContact}
            onCommit={(value) => commit({ emergencyContact: value })}
          />
        </dd>
        <dt>Notes</dt>
        <dd>
          <EditableText
            value={notes}
            placeholder="—"
            multiline
            onChange={setNotes}
            onCommit={(value) => commit({ notes: value })}
          />
        </dd>
      </dl>
      <h3>Enrolled Classes</h3>
      {student.enrolledClasses.length === 0 && <p>Not enrolled in any classes.</p>}
      <ul>
        {student.enrolledClasses.map((c) => (
          <li key={c.id}>
            {c.name} ({c.enrollmentCount} {c.enrollmentCount === 1 ? 'student' : 'students'})
            {c.scheduleName && <span className="editable-text-placeholder"> &mdash; {c.scheduleName}</span>}
            {onRemoveEnrollment && (
              <button type="button" onClick={() => onRemoveEnrollment(student.id, c.id)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <h3>Scheduled Appointments</h3>
      {student.scheduledAppointments.length === 0 && <p>No scheduled appointments.</p>}
      <ul>
        {student.scheduledAppointments.map((a) => (
          <li key={a.id}>
            {DAY_NAMES[a.dayOfWeek]} {formatTimeOfDay(a.startTime)}
            {a.location && <span className="editable-text-placeholder"> &mdash; {a.location}</span>}
            <span className="editable-text-placeholder"> &mdash; {a.scheduleName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface EditableTextProps {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}

/** Renders a value as plain text; clicking it swaps in an input/textarea that saves on blur or Enter. */
function EditableText({ value, placeholder, multiline, onChange, onCommit }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEditing() {
    setDraft(value);
    setIsEditing(true);
  }

  function commit() {
    setIsEditing(false);
    if (draft !== value) {
      onChange(draft);
      onCommit(draft);
    }
  }

  function cancel() {
    setDraft(value);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <span className="editable-text" onClick={startEditing}>
        {value || <span className="editable-text-placeholder">{placeholder ?? 'Click to edit'}</span>}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        className="class-view-textarea"
        value={draft}
        autoFocus
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel();
        }}
      />
    );
  }

  return (
    <input
      type="text"
      className="class-view-input"
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          cancel();
        }
      }}
    />
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
  onSaveClass?: (classId: string, name: string, description: string | null, notes: string | null) => void;
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
              onSaveClass(
                scheduledClassDetail.trainingClassId,
                scheduledClassDetail.trainingClassName ?? '',
                classDescription || null,
                classNotes || null
              );
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
