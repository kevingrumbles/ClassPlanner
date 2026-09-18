import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { ClassDetail } from '../types/models';

interface ClassViewProps {
  trainingClass: ClassDetail;
  onRemoveEnrollment?: (studentId: string, classId: string) => void;
  onDeleteClass?: (classId: string) => void;
  onSaveClass?: (classId: string, name: string, description: string | null, notes: string | null) => void;
}

/** Full-width class detail view that replaces the weekly schedule grid when a class is selected. Students can be dragged onto it to enroll them. */
export function ClassView(props: ClassViewProps) {
  // Keying by class id (and its persisted field values) forces this inner component to remount
  // and reinitialize its local editing state whenever a different class (or fresh data) is selected,
  // without needing an effect to resynchronize state.
  return (
    <ClassViewContent
      key={`${props.trainingClass.id}:${props.trainingClass.name}:${props.trainingClass.description ?? ''}:${props.trainingClass.notes ?? ''}`}
      {...props}
    />
  );
}

function ClassViewContent({ trainingClass, onRemoveEnrollment, onDeleteClass, onSaveClass }: ClassViewProps) {
    const name = trainingClass.name;
    const description = trainingClass.description ?? '';
    const notes = trainingClass.notes ?? '';

    /**
     * Persists as soon as a field is committed, carrying the other values through unchanged so
     * a single edit never clobbers another.
     */
    function save(next: { name?: string; description?: string; notes?: string }) {
        onSaveClass?.(
            trainingClass.id,
            next.name ?? name,
            (next.description ?? description) || null,
            (next.notes ?? notes) || null
        );
    }

    const { setNodeRef, isOver, active } = useDroppable({
        id: `class-view:${trainingClass.id}`,
        data: { type: 'classView', classId: trainingClass.id },
    });

    const isStudentDragActive = active?.data.current?.type === 'student';

    const classNames = ['class-view'];
    if (isOver && isStudentDragActive) classNames.push('is-drop-ready');

    return (
        <div ref={setNodeRef} className={classNames.join(' ')}>
            <div className="class-view-header">
                <h2>
                    <EditableText
                        value={name}
                        placeholder="Class name"
                        onCommit={(value) => save({ name: value })}
                    />
                </h2>
                <div className="class-view-header-actions">
                    {onDeleteClass && (
                        <button type="button" className="class-view-delete" onClick={() => onDeleteClass(trainingClass.id)}>
                            Delete Class
                        </button>
                    )}
                </div>
            </div>

            <p className="class-view-hint">Click any value below to edit it. Changes save automatically.</p>

            <dl className="class-view-details">
                <dt>Description</dt>
                <dd>
                    <EditableTextarea
                        value={description}
                        placeholder="Click to edit"
                        onCommit={(value) => save({ description: value })}
                    />
                </dd>
                <dt>Notes</dt>
                <dd>
                    <EditableTextarea
                        value={notes}
                        placeholder="Click to edit"
                        onCommit={(value) => save({ notes: value })}
                    />
                </dd>
            </dl>

            <h3>Members</h3>
            <dd>
                Count: {trainingClass.enrollmentCount}
            </dd>
            <p className="class-view-hint">Drag a student here to enroll them in this class.</p>
            <ul className="class-view-members">
                {trainingClass.enrolledStudents.map((s) => (
                    <li key={s.id}>
                        <span>
                            {s.firstName} {s.lastName}
                        </span>
                        {onRemoveEnrollment && (
                            <button type="button" onClick={() => onRemoveEnrollment(s.id, trainingClass.id)}>
                                Remove
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface EditableTextareaProps {
    value: string;
    placeholder?: string;
    onCommit: (value: string) => void;
}

/** Renders a value as plain text; clicking it swaps in a textarea that saves on blur and discards on Escape. */
function EditableTextarea({ value, placeholder, onCommit }: EditableTextareaProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    function startEditing() {
        setDraft(value);
        setIsEditing(true);
    }

    function commit() {
        setIsEditing(false);
        if (draft !== value) {
            onCommit(draft);
        }
    }

    if (!isEditing) {
        return (
            <span className="editable-text" onClick={startEditing}>
                {value || <span className="editable-text-placeholder">{placeholder ?? 'Click to edit'}</span>}
            </span>
        );
    }

    return (
        <textarea
            className="class-view-textarea"
            value={draft}
            autoFocus
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    setDraft(value);
                    setIsEditing(false);
                }
            }}
        />
    );
}

interface EditableTextProps {
    value: string;
    placeholder?: string;
    onCommit: (value: string) => void;
}

/** Renders a value as plain text; clicking it swaps in an input that saves on blur or Enter. */
function EditableText({ value, placeholder, onCommit }: EditableTextProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    function startEditing() {
        setDraft(value);
        setIsEditing(true);
    }

    function commit() {
        setIsEditing(false);
        if (draft !== value) {
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
                {value || <span className="editable-text-placeholder">{placeholder ?? 'Click to edit'}</span>}
            </span>
        );
    }

    return (
        <input
            type="text"
            className="class-view-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') cancel();
            }}
        />
    );
}
