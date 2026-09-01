import { useDraggable } from '@dnd-kit/core';
import type { StudentSummary } from '../types/models';

interface StudentTileProps {
  student: StudentSummary;
  onSelect: (id: string) => void;
}

export function StudentTile({ student, onSelect }: StudentTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `student:${student.id}`,
    data: { type: 'student', studentId: student.id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`tile student-tile${isDragging ? ' is-dragging' : ''}`}
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
