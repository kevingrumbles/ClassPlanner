import { useDraggable } from '@dnd-kit/core';
import type { StudentSummary } from '../types/models';

interface StudentTileProps {
  student: StudentSummary;
  onSelect: (id: string) => void;
  isSelected?: boolean;
  /** Hides the enrolled-class line, used where class enrollment is not being represented. */
  hideEnrolledClasses?: boolean;
}

export function StudentTile({ student, onSelect, isSelected, hideEnrolledClasses }: StudentTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `student:${student.id}`,
    data: { type: 'student', studentId: student.id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const classNames = ['tile', 'student-tile'];
  if (isDragging) classNames.push('is-dragging');
  if (isSelected) classNames.push('is-selected');

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={classNames.join(' ')}
      onClick={() => onSelect(student.id)}
    >
      <span className="tile-title">
        {student.firstName} {student.lastName}
      </span>
      {!hideEnrolledClasses && (
        <span className="tile-subtitle">
          {student.enrolledClassCount} enrolled {student.enrolledClassCount === 1 ? 'class' : 'classes'}
        </span>
      )}
      {student.appointmentCount > 0 && (
        <span className="tile-subtitle">
          {student.appointmentCount} {student.appointmentCount === 1 ? 'appointment' : 'appointments'}
        </span>
      )}
    </button>
  );
}
