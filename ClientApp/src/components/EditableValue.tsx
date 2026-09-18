import { useState } from 'react';

interface EditableValueProps {
  /** Formatted value shown when not editing. */
  display: string;
  /** Raw value bound to the input while editing. */
  value: string;
  /** Input type to swap in when the value is clicked. */
  type: 'time' | 'date' | 'number' | 'text';
  /** When false the value renders as plain text and is not clickable. */
  editable?: boolean;
  placeholder?: string;
  min?: number;
  step?: number;
  /** Called with the input's raw value when the edit is committed (blur or Enter). */
  onCommit: (value: string) => void;
}

/**
 * Renders a value as plain text; clicking it swaps in an input that commits on blur or Enter
 * and discards on Escape. Mirrors the click-to-edit behaviour used by the details pane.
 */
export function EditableValue({
  display,
  value,
  type,
  editable = true,
  placeholder,
  min,
  step,
  onCommit,
}: EditableValueProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editable) {
    return <>{display || <span className="editable-text-placeholder">{placeholder ?? '-'}</span>}</>;
  }

  function startEditing() {
    setDraft(value);
    setIsEditing(true);
  }

  function commit() {
    setIsEditing(false);
    if (draft !== value && draft !== '') {
      onCommit(draft);
    }
  }

  function cancel() {
    setDraft(value);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <span className="editable-text" onClick={startEditing}>
        {display || <span className="editable-text-placeholder">{placeholder ?? 'Click to edit'}</span>}
      </span>
    );
  }

  return (
    <input
      type={type}
      className="class-view-input"
      value={draft}
      autoFocus
      min={min}
      step={step}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          cancel();
        }
      }}
    />
  );
}

interface EditableSelectProps {
  /** Formatted value shown when not editing. */
  display: string;
  /** Raw value bound to the select while editing. */
  value: string;
  options: { value: string; label: string }[];
  /** When false the value renders as plain text and is not clickable. */
  editable?: boolean;
  /** Called with the selected value when the edit is committed. */
  onCommit: (value: string) => void;
}

/** Click-to-edit variant backed by a dropdown, committing as soon as a choice is made. */
export function EditableSelect({ display, value, options, editable = true, onCommit }: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!editable || !isEditing) {
    return (
      <span
        className={editable ? 'editable-text' : undefined}
        onClick={editable ? () => setIsEditing(true) : undefined}
      >
        {display}
      </span>
    );
  }

  return (
    <select
      className="class-view-input"
      value={value}
      autoFocus
      onChange={(e) => {
        setIsEditing(false);
        if (e.target.value !== value) {
          onCommit(e.target.value);
        }
      }}
      onBlur={() => setIsEditing(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setIsEditing(false);
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
