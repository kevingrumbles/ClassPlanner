import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import './App.css';
import { Calendar } from './components/Calendar';
import { ClassTile } from './components/ClassTile';
import { DetailsPanel } from './components/DetailsPanel';
import { StudentTile } from './components/StudentTile';
import * as api from './services/api';
import { ApiError } from './services/api';
import type {
  ClassDetail,
  ClassSummary,
  ScheduleDetail,
  ScheduleEntry,
  SelectedObject,
  StudentDetail,
  StudentSummary,
} from './types/models';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

function getStartOfWeek(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (7 + (today.getDay() - 1)) % 7;
  today.setDate(today.getDate() - diff);
  return today;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function App() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [selected, setSelected] = useState<SelectedObject>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail>();
  const [classDetail, setClassDetail] = useState<ClassDetail>();
  const [scheduleDetail, setScheduleDetail] = useState<ScheduleDetail>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);

  const weekStart = getStartOfWeek();
  const weekDays = getWeekDays(weekStart);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const loadAll = async () => {
    try {
      const [studentsData, classesData, scheduleData] = await Promise.all([
        api.getStudents(),
        api.getClasses(),
        api.getSchedule(),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setSchedule(scheduleData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load data.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadAll();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selected) {
        setStudentDetail(undefined);
        setClassDetail(undefined);
        setScheduleDetail(undefined);
        return;
      }

      setDetailLoading(true);
      try {
        if (selected.type === 'student') {
          setClassDetail(undefined);
          setScheduleDetail(undefined);
          setStudentDetail(await api.getStudent(selected.id));
        } else if (selected.type === 'class') {
          setStudentDetail(undefined);
          setScheduleDetail(undefined);
          setClassDetail(await api.getClass(selected.id));
        } else {
          setStudentDetail(undefined);
          setClassDetail(undefined);
          setScheduleDetail(await api.getScheduleDetail(selected.id));
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
    }
    // refresh summary lists to stay in sync
    const [studentsData, classesData] = await Promise.all([api.getStudents(), api.getClasses()]);
    setStudents(studentsData);
    setClasses(classesData);
  }

  async function handleScheduleClass(classId: string, startTime: string) {
    try {
      const entry = await api.scheduleClass(classId, startTime);
      setSchedule((prev) => [...prev, entry]);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to schedule class.');
    }
  }

  async function handleMoveSchedule(scheduleId: string, startTime: string) {
    const previousSchedule = schedule;
    setSchedule((prev) => prev.map((s) => (s.id === scheduleId ? { ...s, startTime } : s)));

    try {
      const updated = await api.moveScheduledClass(scheduleId, startTime);
      setSchedule((prev) => prev.map((s) => (s.id === scheduleId ? updated : s)));
      if (selected?.type === 'schedule' && selected.id === scheduleId) {
        setScheduleDetail(await api.getScheduleDetail(scheduleId));
      }
    } catch (err) {
      setSchedule(previousSchedule);
      showError(err instanceof ApiError ? err.message : 'Unable to move scheduled class.');
    }
  }

  async function handleRemoveSchedule(scheduleId: string) {
    const previousSchedule = schedule;
    setSchedule((prev) => prev.filter((s) => s.id !== scheduleId));
    setSelected(null);

    try {
      await api.removeScheduledClass(scheduleId);
    } catch (err) {
      setSchedule(previousSchedule);
      showError(err instanceof ApiError ? err.message : 'Unable to remove scheduled class.');
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
      const entry = schedule.find((s) => s.id === data.scheduleId);
      setActiveDragLabel(entry?.trainingClassName ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragLabel(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'student' && overData?.type === 'class') {
      handleEnroll(activeData.studentId as string, overData.classId as string);
      return;
    }

    if (overData?.type === 'slot') {
      const day = new Date(overData.day as string);
      day.setHours(overData.hour as number, 0, 0, 0);
      const startTime = day.toISOString();

      if (activeData?.type === 'class') {
        handleScheduleClass(activeData.classId as string, startTime);
      } else if (activeData?.type === 'scheduled') {
        handleMoveSchedule(activeData.scheduleId as string, startTime);
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app">
        <header className="app-header">
          <h1>Class Planner</h1>
          <span>Week of {weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
        </header>

        {error && (
          <div className="app-error">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="app-body">
          <aside className="sidebar">
            <h2>Students</h2>
            <div className="tile-list">
              {students.map((student) => (
                <StudentTile key={student.id} student={student} onSelect={(id) => setSelected({ type: 'student', id })} />
              ))}
            </div>

            <h2>Classes</h2>
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

          <div className="calendar-region">
            <Calendar weekStart={weekStart} schedule={schedule} onSelectSchedule={(id) => setSelected({ type: 'schedule', id })} />
          </div>

          {selected && (
            <DetailsPanel
              onClose={() => setSelected(null)}
              loading={detailLoading}
              student={studentDetail}
              trainingClass={classDetail}
              scheduleDetail={scheduleDetail}
              allClasses={classes}
              allStudents={students}
              onEnroll={handleEnroll}
              onRemoveEnrollment={handleRemoveEnrollment}
              weekDays={weekDays}
              hours={HOURS}
              onScheduleClass={handleScheduleClass}
              onMoveSchedule={handleMoveSchedule}
              onRemoveSchedule={handleRemoveSchedule}
            />
          )}
        </div>
      </div>

      <DragOverlay>{activeDragLabel ? <div className="tile drag-overlay-tile">{activeDragLabel}</div> : null}</DragOverlay>
    </DndContext>
  );
}

export default App;
