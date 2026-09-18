import { useDroppable } from '@dnd-kit/core';
import type { DayOfWeekIndex } from '../types/models';

interface CalendarSlotProps {
  dayOfWeek: DayOfWeekIndex;
  hour: number;
  minute: number;
  /** Specific calendar date (ISO "yyyy-MM-dd") for this slot, when known (Calendar View mode). */
  date?: string;
}

/** A single droppable day-of-week/hour/minute cell in the weekly schedule grid (no specific date). Represents a 15-minute increment. */
export function CalendarSlot({ dayOfWeek, hour, minute, date }: CalendarSlotProps) {
  // Include the date so Calendar View slots are unique per week. Without it every week (and the
  // dateless Schedule View grid) would register droppables under the same ids, and dnd-kit would
  // resolve a drop to whichever duplicate it saw first - losing the date the drop landed on.
  const id = date
    ? `slot:${date}:${hour}:${minute}`
    : `slot:${dayOfWeek}:${hour}:${minute}`;
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: { type: 'slot', dayOfWeek, hour, minute, date },
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
