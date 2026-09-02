import { useDroppable } from '@dnd-kit/core';
import type { DayOfWeekIndex } from '../types/models';

interface CalendarSlotProps {
  dayOfWeek: DayOfWeekIndex;
  hour: number;
  minute: number;
}

/** A single droppable day-of-week/hour/minute cell in the weekly schedule grid (no specific date). Represents a 15-minute increment. */
export function CalendarSlot({ dayOfWeek, hour, minute }: CalendarSlotProps) {
  const id = `slot:${dayOfWeek}:${hour}:${minute}`;
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: { type: 'slot', dayOfWeek, hour, minute },
  });

  const isClassDragActive =
    active?.data.current?.type === 'class' ||
    active?.data.current?.type === 'scheduled' ||
    active?.data.current?.type === 'student';

  return (
    <div
      ref={setNodeRef}
      className={`calendar-quarter-slot${isOver && isClassDragActive ? ' is-drop-ready' : ''}`}
    />
  );
}
