import { useDroppable } from '@dnd-kit/core';
import type { DayOfWeekIndex } from '../types/models';

interface CalendarSlotProps {
  dayOfWeek: DayOfWeekIndex;
  hour: number;
}

/** A single droppable day-of-week/hour cell in the weekly schedule grid (no specific date). */
export function CalendarSlot({ dayOfWeek, hour }: CalendarSlotProps) {
  const id = `slot:${dayOfWeek}:${hour}`;
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: { type: 'slot', dayOfWeek, hour },
  });

  const isClassDragActive = active?.data.current?.type === 'class' || active?.data.current?.type === 'scheduled';

  return (
    <div
      ref={setNodeRef}
      className={`calendar-slot${isOver && isClassDragActive ? ' is-drop-ready' : ''}`}
    />
  );
}
