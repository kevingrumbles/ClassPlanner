import { useDroppable } from '@dnd-kit/core';

interface CalendarSlotProps {
  day: Date;
  hour: number;
}

/** A single droppable weekday/hour cell in the calendar grid. */
export function CalendarSlot({ day, hour }: CalendarSlotProps) {
  const id = `slot:${day.toISOString().slice(0, 10)}:${hour}`;
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: { type: 'slot', day: day.toISOString(), hour },
  });

  const isClassDragActive = active?.data.current?.type === 'class' || active?.data.current?.type === 'scheduled';

  return (
    <div
      ref={setNodeRef}
      className={`calendar-slot${isOver && isClassDragActive ? ' is-drop-ready' : ''}`}
    />
  );
}
