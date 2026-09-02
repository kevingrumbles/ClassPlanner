import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import './App.css';
import { Calendar } from './components/Calendar';
import { ClassTile } from './components/ClassTile';
import { ClassView } from './components/ClassView';
import { DetailsPanel } from './components/DetailsPanel';
import { ScheduleTile } from './components/ScheduleTile';
import { StudentTile } from './components/StudentTile';
import * as api from './services/api';
import { ApiError } from './services/api';
import type {
  ClassDetail,
  ClassSummary,
  DayOfWeekIndex,
  ScheduleDetail,
  ScheduleSummary,
  ScheduledClassDetail,
  SelectedObject,
  StudentDetail,
  StudentSummary,
} from './types/models';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

function App() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [activeScheduleDetail, setActiveScheduleDetail] = useState<ScheduleDetail>();
  const [selected, setSelected] = useState<SelectedObject>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail>();
  const [classDetail, setClassDetail] = useState<ClassDetail>();
  const [scheduledClassDetail, setScheduledClassDetail] = useState<ScheduledClassDetail>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const loadAll = async () => {
    try {
      const [studentsData, schedulesData] = await Promise.all([
        api.getStudents(),
        api.getSchedules(),
      ]);
      setStudents(studentsData);
      setSchedules(schedulesData);
      setActiveScheduleId((prev) => prev ?? schedulesData[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load data.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadAll();
  }, []);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!activeScheduleId) {
        setActiveScheduleDetail(undefined);
        setClasses([]);
        return;
      }
      try {
        const [scheduleDetail, classesData] = await Promise.all([
          api.getScheduleDetail(activeScheduleId),
          api.getClasses(activeScheduleId),
        ]);
        setActiveScheduleDetail(scheduleDetail);
        setClasses(classesData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load schedule.');
      }
    };
    loadSchedule();
  }, [activeScheduleId]);

  useEffect(() => {
    const load = async () => {
      if (!selected) {
        setStudentDetail(undefined);
        setClassDetail(undefined);
        setScheduledClassDetail(undefined);
        return;
      }

      setDetailLoading(true);
      try {
        if (selected.type === 'student') {
          setClassDetail(undefined);
          setScheduledClassDetail(undefined);
          setStudentDetail(await api.getStudent(selected.id));
        } else if (selected.type === 'class') {
          setStudentDetail(undefined);
          setScheduledClassDetail(undefined);
          setClassDetail(await api.getClass(selected.id));
        } else {
          setStudentDetail(undefined);
          setClassDetail(undefined);
          setScheduledClassDetail(await api.getScheduledClassDetail(selected.scheduleId, selected.entryId));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load details.');
      } finally {
        setDetailLoading(false);
      }
    };
    load();
  }, [selected]);

  function showError(message: string) {
    setError(message);
  }

  async function handleEnroll(studentId: string, classId: string) {
    // Optimistically reflect the enrollment in the UI, but revert if the API rejects it.
    const previousStudents = students;
    const previousClasses = classes;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, enrolledClassCount: s.enrolledClassCount + 1 } : s))
    );
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, enrollmentCount: c.enrollmentCount + 1 } : c))
    );

    try {
      await api.enrollStudent(classId, studentId);
      await refreshDetail();
    } catch (err) {
      setStudents(previousStudents);
      setClasses(previousClasses);
      showError(err instanceof ApiError ? err.message : 'Unable to enroll student.');
    }
  }

  async function handleRemoveEnrollment(studentId: string, classId: string) {
    const previousStudents = students;
    const previousClasses = classes;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, enrolledClassCount: Math.max(0, s.enrolledClassCount - 1) } : s))
    );
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, enrollmentCount: Math.max(0, c.enrollmentCount - 1) } : c))
    );

    try {
      await api.removeStudentFromClass(classId, studentId);
      await refreshDetail();
    } catch (err) {
      setStudents(previousStudents);
      setClasses(previousClasses);
      showError(err instanceof ApiError ? err.message : 'Unable to remove student from class.');
    }
  }

  async function refreshDetail() {
    if (!selected) return;
    if (selected.type === 'student') {
      setStudentDetail(await api.getStudent(selected.id));
    } else if (selected.type === 'class') {
      setClassDetail(await api.getClass(selected.id));
    } else if (selected.type === 'scheduledClass') {
      setScheduledClassDetail(await api.getScheduledClassDetail(selected.scheduleId, selected.entryId));
    }
    // refresh summary lists to stay in sync
    const [studentsData, classesData] = await Promise.all([api.getStudents(), api.getClasses(activeScheduleId ?? undefined)]);
    setStudents(studentsData);
    setClasses(classesData);
  }

  async function handleScheduleClass(classId: string, dayOfWeek: DayOfWeekIndex, startTime: string) {
    if (!activeScheduleId) return;
    try {
      await api.scheduleClass(activeScheduleId, classId, dayOfWeek, startTime);
      setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId));
      setSchedules(await api.getSchedules());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to schedule class.');
    }
  }

  async function handleScheduleStudent(studentId: string, dayOfWeek: DayOfWeekIndex, startTime: string) {
    if (!activeScheduleId) return;
    try {
      await api.scheduleStudent(activeScheduleId, studentId, dayOfWeek, startTime);
      setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId));
      setSchedules(await api.getSchedules());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to schedule student.');
    }
  }

  async function handleMoveScheduledClass(
    entryId: string,
    dayOfWeek: DayOfWeekIndex,
    startTime: string,
    duration?: string,
    location?: string | null
  ) {
    if (!activeScheduleId) return;
    const previousDetail = activeScheduleDetail;
    const existing = activeScheduleDetail?.entries.find((e) => e.id === entryId);
    const resolvedDuration = duration ?? existing?.duration;
    const resolvedLocation = location !== undefined ? location : existing?.location;
    setActiveScheduleDetail((prev) =>
      prev
        ? { ...prev, entries: prev.entries.map((e) => (e.id === entryId ? { ...e, dayOfWeek, startTime } : e)) }
        : prev
    );

    try {
      await api.moveScheduledClass(activeScheduleId, entryId, dayOfWeek, startTime, resolvedDuration, resolvedLocation);
      setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId));
      if (selected?.type === 'scheduledClass' && selected.entryId === entryId) {
        setScheduledClassDetail(await api.getScheduledClassDetail(activeScheduleId, entryId));
      }
    } catch (err) {
      setActiveScheduleDetail(previousDetail);
      showError(err instanceof ApiError ? err.message : 'Unable to move scheduled class.');
    }
  }

  async function handleRemoveScheduledClass(entryId: string) {
    if (!activeScheduleId) return;
    const previousDetail = activeScheduleDetail;
    setActiveScheduleDetail((prev) => (prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== entryId) } : prev));
    if (selected?.type === 'scheduledClass' && selected.entryId === entryId) {
      setSelected(null);
    }

    try {
      await api.removeScheduledClass(activeScheduleId, entryId);
      setSchedules(await api.getSchedules());
    } catch (err) {
      setActiveScheduleDetail(previousDetail);
      showError(err instanceof ApiError ? err.message : 'Unable to remove scheduled class.');
    }
  }

  async function handleCreateSchedule() {
    const name = window.prompt('Schedule name');
    if (!name) return;
    try {
      const created = await api.createSchedule(name);
      setSchedules((prev) => [...prev, created]);
      setActiveScheduleId(created.id);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to create schedule.');
    }
  }

  async function handleCreateClass() {
    if (!activeScheduleId) return;
    const name = window.prompt('Class name');
    if (!name) return;
    try {
      const created = await api.createClass(activeScheduleId, name);
      setClasses((prev) => [...prev, created]);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to create class.');
    }
  }

  async function handleCreateStudent() {
    const firstName = window.prompt('Student first name');
    if (!firstName) return;
    const lastName = window.prompt('Student last name');
    if (!lastName) return;
    try {
      const created = await api.createStudent(firstName, lastName);
      setStudents((prev) => [...prev, created]);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to create student.');
    }
  }

  async function handleDeleteClass(classId: string) {
    if (!window.confirm('Delete this class? This will remove all its enrollments and scheduled entries.')) return;
    try {
      await api.deleteClass(classId);
      setClasses((prev) => prev.filter((c) => c.id !== classId));
      if (selected?.type === 'class' && selected.id === classId) {
        setSelected(null);
      }
      setSchedules(await api.getSchedules());
      if (activeScheduleId) {
        setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId));
      }
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to delete class.');
    }
  }

  async function handleSaveStudent(
    studentId: string,
    email: string | null,
    phone: string | null,
    notes: string | null
  ) {
    try {
      const updated = await api.updateStudent(studentId, email, phone, notes);
      setStudentDetail(updated);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to save student changes.');
    }
  }

  async function handleSaveClass(classId: string, description: string | null, notes: string | null) {
    try {
      const updated = await api.updateClass(classId, description, notes);
      setClassDetail(updated);
      if (selected?.type === 'scheduledClass') {
        setScheduledClassDetail(await api.getScheduledClassDetail(selected.scheduleId, selected.entryId));
      }
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to save class changes.');
    }
  }

  async function handleSaveScheduledClass(
    entryId: string,
    dayOfWeek: DayOfWeekIndex,
    startTime: string,
    duration: string,
    location: string | null
  ) {
    await handleMoveScheduledClass(entryId, dayOfWeek, startTime, duration, location);
  }

  async function handleDeleteStudent(studentId: string) {
    if (!window.confirm('Delete this student? This will remove all their enrollments.')) return;
    try {
      await api.deleteStudent(studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      if (selected?.type === 'student' && selected.id === studentId) {
        setSelected(null);
      }
      setClasses(await api.getClasses(activeScheduleId ?? undefined));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to delete student.');
    }
  }

  async function handleDeleteSchedule() {
    if (!activeScheduleId) return;
    if (!window.confirm('Delete this schedule and all its scheduled classes?')) return;
    try {
      await api.deleteSchedule(activeScheduleId);
      const remaining = schedules.filter((s) => s.id !== activeScheduleId);
      setSchedules(remaining);
      setActiveScheduleId(remaining[0]?.id ?? null);
      setSelected(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to delete schedule.');
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === 'student') {
      const student = students.find((s) => s.id === data.studentId);
      setActiveDragLabel(student ? `${student.firstName} ${student.lastName}` : null);
    } else if (data?.type === 'class') {
      const trainingClass = classes.find((c) => c.id === data.classId);
      setActiveDragLabel(trainingClass?.name ?? null);
    } else if (data?.type === 'scheduled') {
      const entry = activeScheduleDetail?.entries.find((e) => e.id === data.entryId);
      setActiveDragLabel(entry?.trainingClassName ?? entry?.studentName ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragLabel(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'student' && (overData?.type === 'class' || overData?.type === 'classView')) {
      handleEnroll(activeData.studentId as string, overData.classId as string);
      return;
    }

    if (overData?.type === 'slot') {
      const dayOfWeek = overData.dayOfWeek as DayOfWeekIndex;
      const minute = (overData.minute as number | undefined) ?? 0;
      const startTime = `${(overData.hour as number).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

      if (activeData?.type === 'class') {
        handleScheduleClass(activeData.classId as string, dayOfWeek, startTime);
      } else if (activeData?.type === 'student') {
        handleScheduleStudent(activeData.studentId as string, dayOfWeek, startTime);
      } else if (activeData?.type === 'scheduled') {
        handleMoveScheduledClass(activeData.entryId as string, dayOfWeek, startTime);
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app">
        <header className="tool-ribbon">
          <h1>Class Planner</h1>
        </header>

        {error && (
          <div className="app-error">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="app-main">
          <div className="top-pane">
            <div className="tile-row">
              {schedules.map((schedule) => (
                <ScheduleTile
                  key={schedule.id}
                  schedule={schedule}
                  isActive={schedule.id === activeScheduleId}
                  onSelect={(id) => {
                    setActiveScheduleId(id);
                    setSelected(null);
                  }}
                />
              ))}
            </div>
            <div className="top-pane-actions">
              <button type="button" onClick={handleCreateSchedule}>
                New Schedule
              </button>
              {activeScheduleId && (
                <button type="button" onClick={handleDeleteSchedule}>
                  Delete Schedule
                </button>
              )}
            </div>
          </div>

          <aside className="left-pane">
            <h2>Classes</h2>
            <button type="button" className="pane-section-action" onClick={handleCreateClass} disabled={!activeScheduleId}>
              New Class
            </button>
            <div className="tile-list">
              {classes.map((trainingClass) => (
                <ClassTile
                  key={trainingClass.id}
                  trainingClass={trainingClass}
                  onSelect={(id) => setSelected({ type: 'class', id })}
                  isDropTarget
                />
              ))}
            </div>
          </aside>

          <main className="focus-pane">
            {classDetail ? (
              <ClassView
                trainingClass={classDetail}
                onRemoveEnrollment={handleRemoveEnrollment}
                onDeleteClass={handleDeleteClass}
                onSaveClass={handleSaveClass}
              />
            ) : selected ? (
              <DetailsPanel
                loading={detailLoading}
                student={studentDetail}
                scheduledClassDetail={scheduledClassDetail}
                onRemoveEnrollment={handleRemoveEnrollment}
                onDeleteStudent={handleDeleteStudent}
                onSaveStudent={handleSaveStudent}
                onRemoveScheduledClass={handleRemoveScheduledClass}
                onSaveScheduledClass={handleSaveScheduledClass}
                onSaveClass={handleSaveClass}
              />
            ) : (
              <Calendar
                entries={activeScheduleDetail?.entries ?? []}
                hours={HOURS}
                onSelectEntry={(entryId) =>
                  activeScheduleId && setSelected({ type: 'scheduledClass', scheduleId: activeScheduleId, entryId })
                }
                scheduleName={activeScheduleDetail?.name}
              />
            )}
          </main>

          <aside className="right-pane">
            <h2>Students</h2>
            <button type="button" className="pane-section-action" onClick={handleCreateStudent}>
              New Student
            </button>
            <div className="tile-list">
              {students.map((student) => (
                <StudentTile key={student.id} student={student} onSelect={(id) => setSelected({ type: 'student', id })} />
              ))}
            </div>
          </aside>
        </div>
      </div>

      <DragOverlay>{activeDragLabel ? <div className="tile drag-overlay-tile">{activeDragLabel}</div> : null}</DragOverlay>
    </DndContext>
  );
}

export default App;
