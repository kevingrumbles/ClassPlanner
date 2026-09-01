import { useDroppable } from '@dnd-kit/core';
import type { ClassDetail } from '../types/models';
import { formatDuration } from './format';

interface ClassViewProps {
  trainingClass: ClassDetail;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
}

/** Full-width class detail view that replaces the weekly schedule grid when a class is selected. Students can be dragged onto it to enroll them. */
export function ClassView({ trainingClass, onRemoveEnrollment }: ClassViewProps) {
  const isFull = trainingClass.enrollmentCount >= trainingClass.maximumStudents;

  const { setNodeRef, isOver, active } = useDroppable({
    id: `class-view:${trainingClass.id}`,
    data: { type: 'classView', classId: trainingClass.id },
  });

  const isStudentDragActive = active?.data.current?.type === 'student';

  const classNames = ['class-view'];
  if (isOver && isStudentDragActive && !isFull) classNames.push('is-drop-ready');
  if (isOver && isStudentDragActive && isFull) classNames.push('is-drop-rejected');

  return (
    <div ref={setNodeRef} className={classNames.join(' ')}>
      <div className="class-view-header">
        <h2>{trainingClass.name}</h2>
      </div>

      <dl className="class-view-details">
        <dt>Description</dt>
        <dd>{trainingClass.description || '—'}</dd>
        <dt>Capacity</dt>
        <dd>
          {trainingClass.enrollmentCount} / {trainingClass.maximumStudents}
          {isFull ? ' (full)' : ''}
        </dd>
        <dt>Duration</dt>
        <dd>{formatDuration(trainingClass.duration)}</dd>
        <dt>Location</dt>
        <dd>{trainingClass.location || '—'}</dd>
        <dt>Notes</dt>
        <dd>{trainingClass.notes || '—'}</dd>
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
