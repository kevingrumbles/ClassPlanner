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
    const [name, setName] = useState(trainingClass.name);
    const [description, setDescription] = useState(trainingClass.description ?? '');
    const [notes, setNotes] = useState(trainingClass.notes ?? '');

    const isDirty = description !== (trainingClass.description ?? '') || notes !== (trainingClass.notes ?? '');

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
                        onChange={setName}
                        onCommit={(value) => onSaveClass?.(trainingClass.id, value, description || null, notes || null)}
                    />
                </h2>
                <div className="class-view-header-actions">
                    {isDirty && onSaveClass && (
                        <button
                            type="button"
                            className="class-view-save"
                            onClick={() => onSaveClass(trainingClass.id, name, description || null, notes || null)}
                        >
                            Save Changes
                        </button>
                    )}
                    {onDeleteClass && (
                        <button type="button" className="class-view-delete" onClick={() => onDeleteClass(trainingClass.id)}>
                            Delete Class
                        </button>
                    )}
                </div>
            </div>

            <dl className="class-view-details">
                <dt>Description</dt>
                <dd>
                    <EditableTextarea
                        value={description}
                        placeholder="—"
                        onChange={setDescription}
                    />
                </dd>
                <dt>Notes</dt>
                <dd>
                    <EditableTextarea
                        value={notes}
                        placeholder="—"
                        onChange={setNotes}
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
    onChange: (value: string) => void;
}

/** Renders a value as plain text; clicking it swaps in a textarea for editing. Changes are tracked via onChange, saved by the parent's Save Changes button. */
function EditableTextarea({ value, placeholder, onChange }: EditableTextareaProps) {
    const [isEditing, setIsEditing] = useState(false);

    if (!isEditing) {
        return (
            <span className="editable-text" onClick={() => setIsEditing(true)}>
                {value || <span className="editable-text-placeholder">{placeholder ?? 'Click to edit'}</span>}
            </span>
        );
    }

    return (
        <textarea
            className="class-view-textarea"
            value={value}
            autoFocus
            rows={2}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditing(false);
            }}
        />
    );
}

interface EditableTextProps {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    onCommit: (value: string) => void;
}

/** Renders a value as plain text; clicking it swaps in an input that saves on blur or Enter. */
function EditableText({ value, placeholder, onChange, onCommit }: EditableTextProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    function startEditing() {
        setDraft(value);
        setIsEditing(true);
    }

    function commit() {
        setIsEditing(false);
        if (draft !== value) {
            onChange(draft);
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
