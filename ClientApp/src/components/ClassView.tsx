import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { ClassDetail } from '../types/models';
import { formatDuration } from './format';

interface ClassViewProps {
  trainingClass: ClassDetail;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
  onDeleteClass?: (classId: string) => void;
  onSaveClass?: (classId: string, description: string | null, notes: string | null) => void;
}

/** Full-width class detail view that replaces the weekly schedule grid when a class is selected. Students can be dragged onto it to enroll them. */
export function ClassView(props: ClassViewProps) {
  // Keying by class id (and its persisted field values) forces this inner component to remount
  // and reinitialize its local editing state whenever a different class (or fresh data) is selected,
  // without needing an effect to resynchronize state.
  return (
    <ClassViewContent
      key={`${props.trainingClass.id}:${props.trainingClass.description ?? ''}:${props.trainingClass.notes ?? ''}`}
      {...props}
    />
  );
}

function ClassViewContent({ trainingClass, onRemoveEnrollment, onDeleteClass, onSaveClass }: ClassViewProps) {
  const [description, setDescription] = useState(trainingClass.description ?? '');
  const [notes, setNotes] = useState(trainingClass.notes ?? '');

  const isDirty = description !== (trainingClass.description ?? '') || notes !== (trainingClass.notes ?? '');

  const { setNodeRef, isOver, active } = useDroppable({
    id: `class-view:${trainingClass.id}`,
    data: { type: 'classView', classId: trainingClass.id },
  });

  const isStudentDragActive = active?.data.current?.type === 'student';

  const classNames = ['class-view'];
  if (isOver && isStudentDragActive) classNames.push('is-drop-ready');

  return (
    <div ref={setNodeRef} className={classNames.join(' ')}>
      <div className="class-view-header">
        <h2>{trainingClass.name}</h2>
        {isDirty && onSaveClass && (
          <button
            type="button"
            className="class-view-save"
            onClick={() => onSaveClass(trainingClass.id, description || null, notes || null)}
          >
            Save Changes
          </button>
        )}
        {onDeleteClass && (
          <button type="button" className="class-view-delete" onClick={() => onDeleteClass(trainingClass.id)}>
            Delete Class
          </button>
        )}
      </div>

      <dl className="class-view-details">
        <dt>Description</dt>
        <dd>
          <textarea
            className="class-view-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </dd>
        <dt>Membership</dt>
        <dd>
          {trainingClass.enrollmentCount} {trainingClass.enrollmentCount === 1 ? 'student' : 'students'}
        </dd>
        <dt>Duration</dt>
        <dd>{formatDuration(trainingClass.duration)}</dd>
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

      <h3>Members</h3>
      <p className="class-view-hint">Drag a student here to enroll them in this class.</p>
      {trainingClass.enrolledStudents.length === 0 && <p>No students enrolled.</p>}
      <ul className="class-view-members">
        {trainingClass.enrolledStudents.map((s) => (
          <li key={s.id}>
            <span>
              {s.firstName} {s.lastName}
            </span>
            {onRemoveEnrollment && (
              <button type="button" onClick={() => onRemoveEnrollment(s.id, trainingClass.id)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
