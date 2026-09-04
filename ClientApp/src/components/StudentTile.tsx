import { useDraggable } from '@dnd-kit/core';
import type { StudentSummary } from '../types/models';

interface StudentTileProps {
  student: StudentSummary;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export function StudentTile({ student, onSelect, isSelected }: StudentTileProps) {
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
      <span className="tile-subtitle">
        {student.enrolledClassCount} enrolled {student.enrolledClassCount === 1 ? 'class' : 'classes'}
      </span>
    </button>
  );
}
