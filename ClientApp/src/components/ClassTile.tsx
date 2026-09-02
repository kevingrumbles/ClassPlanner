import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ClassSummary } from '../types/models';

interface ClassTileProps {
  trainingClass: ClassSummary;
  onSelect: (id: string) => void;
  isDropTarget?: boolean;
}

export function ClassTile({ trainingClass, onSelect, isDropTarget }: ClassTileProps) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `class:${trainingClass.id}`,
    data: { type: 'class', classId: trainingClass.id },
  });

  const { setNodeRef: setDropRef, isOver, active } = useDroppable({
    id: `class-drop:${trainingClass.id}`,
    data: { type: 'class', classId: trainingClass.id },
  });

  const isStudentDragActive = active?.data.current?.type === 'student';
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const classNames = ['tile', 'class-tile'];
  if (isDragging) classNames.push('is-dragging');
  if (isDropTarget && isOver && isStudentDragActive) classNames.push('is-drop-ready');

  return (
    <button
      type="button"
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      style={style}
      {...listeners}
      {...attributes}
      className={classNames.join(' ')}
      onClick={() => onSelect(trainingClass.id)}
    >
      <span className="tile-title">{trainingClass.name}</span>
      <span className="tile-subtitle">
        {trainingClass.enrollmentCount} {trainingClass.enrollmentCount === 1 ? 'student' : 'students'}
      </span>
    </button>
  );
}
