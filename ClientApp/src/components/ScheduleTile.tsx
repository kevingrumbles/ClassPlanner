import type { ScheduleSummary } from '../types/models';

interface ScheduleTileProps {
  schedule: ScheduleSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export function ScheduleTile({ schedule, isActive, onSelect }: ScheduleTileProps) {
  return (
    <button
      type="button"
      className={`tile schedule-tile${isActive ? ' is-active' : ''}`}
      aria-pressed={isActive}
      onClick={() => onSelect(schedule.id)}
    >
      <span className="tile-title">{schedule.name}</span>
      <span className="tile-subtitle">
        {schedule.entryCount} {schedule.entryCount === 1 ? 'class scheduled' : 'classes scheduled'}
      </span>
    </button>
  );
}
