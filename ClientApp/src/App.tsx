import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { Calendar } from './components/Calendar';
import { CalendarEntryDetails } from './components/CalendarEntryDetails';
import { CalendarStudentDetails } from './components/CalendarStudentDetails';
import { ClassTile } from './components/ClassTile';
import { ClassView } from './components/ClassView';
import { DetailsPanel } from './components/DetailsPanel';
import { ScheduleTile } from './components/ScheduleTile';
import { StudentTile } from './components/StudentTile';
import * as api from './services/api';
import { ApiError } from './services/api';
import { addDays, startOfWeek, toIsoDate } from './components/format';
import type {
  ClassDetail,
  ClassSummary,
  DayOfWeekIndex,
  GoogleCalendarEvent,
  GoogleCalendarStatus,
  ScheduleDetail,
  ScheduleSummary,
  ScheduledClassDetail,
  ScheduledClassEntry,
  SelectedObject,
  StudentDetail,
  StudentSummary,
} from './types/models';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const DEFAULT_APPOINTMENT_DURATION = '00:30:00';

/**
 * A student appointment created via Calendar View drag-and-drop that has not yet been pushed
 * to Google Calendar. It is not associated with any ClassPlanner schedule; it exists only in
 * local browser state until synced.
 */
interface PendingAppointment {
  id: string;
  studentId: string;
  studentName: string;
  eventDate: string;
  startTime: string;
  duration: string;
}


function App() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [viewMode, setViewMode] = useState<'schedule' | 'calendar'>('schedule');
  const [calendarViewDate, setCalendarViewDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [activeScheduleDetail, setActiveScheduleDetail] = useState<ScheduleDetail>();
  const [selected, setSelected] = useState<SelectedObject>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail>();
  const [classDetail, setClassDetail] = useState<ClassDetail>();
  const [scheduledClassDetail, setScheduledClassDetail] = useState<ScheduledClassDetail>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus>({ connected: false });
  const [isUpdatingGoogleCalendar, setIsUpdatingGoogleCalendar] = useState(false);
  const [googleSyncMessage, setGoogleSyncMessage] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  /**
   * Edits made to appointments already on Google Calendar that have not been uploaded yet.
   * Keyed by Google event id. These overlay the fetched event so the grid shows the pending
   * values, and the entry is flagged as unsaved until it is uploaded.
   */
  const [googleEventEdits, setGoogleEventEdits] = useState<
    Record<string, { eventDate: string; startTime: string; duration: string }>
  >({});
  const [isLoadingGoogleEvents, setIsLoadingGoogleEvents] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  /** Guards the sync against overlapping runs; see handleSyncPendingAppointments. */
  const isSyncingRef = useRef(false);
  const [googleUnavailableReason, setGoogleUnavailableReason] = useState<string | null>(null);
  const googleTokenClientRef = useRef<GoogleTokenClient | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const loadAll = async () => {
    try {
      const [studentsData, schedulesData] = await Promise.all([
        api.getStudents(activeScheduleId ?? undefined),
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial Google config/status fetch on mount
    initGoogle();
  }, []);

  const initGoogle = async () => {
    try {
      const config = await api.getGoogleConfig();
      if (!config.clientId) {
        setGoogleUnavailableReason(
          'Google client id is not configured. Run: dotnet user-secrets set "Google:ClientId" "<your-client-id>"'
        );
        return;
      }

      const oauth2 = await waitForGoogleIdentityServices();
      if (!oauth2) {
        setGoogleUnavailableReason(
          'The Google Identity Services script failed to load. Check your network connection or ad/tracker blockers.'
        );
        return;
      }

      googleTokenClientRef.current = oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scope,
        callback: (response) => {
          if (response.access_token) {
            setGoogleAccessToken(response.access_token);
            api
              .getGoogleStatus(response.access_token)
              .then(setGoogleStatus)
              .catch(() => setGoogleStatus({ connected: false }));
          } else {
            showError(response.error_description ?? 'Unable to connect Google Calendar.');
          }
        },
        error_callback: (err) => {
          showError(err.message ?? 'Unable to connect Google Calendar.');
        },
      });

      // Prompt automatically on load. An empty prompt lets Google reuse an existing session
      // and complete without any visible dialog when the user has already granted consent.
      googleTokenClientRef.current.requestAccessToken({ prompt: '' });
    } catch {
      setGoogleUnavailableReason('Unable to initialize Google sign-in.');
    }
  };

  // The GIS <script> tag is loaded async/defer, so it may not be ready yet when this
  // component mounts. Poll briefly for window.google.accounts.oauth2 to appear.
  function waitForGoogleIdentityServices(timeoutMs = 5000, intervalMs = 100) {
    return new Promise<NonNullable<Window['google']>['accounts']['oauth2'] | null>((resolve) => {
      const start = Date.now();
      const check = () => {
        if (window.google?.accounts?.oauth2) {
          resolve(window.google.accounts.oauth2);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(null);
          return;
        }
        setTimeout(check, intervalMs);
      };
      check();
    });
  }

  /**
   * Reloads the events on the Class Planner Google Calendar. Called on sign-in and after any
   * action that changes what is on that calendar, so Calendar View stays current.
   *
   * Pass `silent` for background reloads that follow a change the user has already seen applied;
   * these update the grid in place without dimming it behind the loading overlay.
   */
  async function refreshGoogleEvents(silent = false) {
    if (!googleAccessToken) {
      return;
    }
    if (!silent) {
      setIsLoadingGoogleEvents(true);
    }
    try {
      setGoogleEvents(await api.getGoogleEvents(googleAccessToken));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load Google Calendar events.');
    } finally {
      if (!silent) {
        setIsLoadingGoogleEvents(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    const loadGoogleEvents = async () => {
      if (!googleAccessToken) {
        return;
      }
      setIsLoadingGoogleEvents(true);
      try {
        const events = await api.getGoogleEvents(googleAccessToken);
        if (!cancelled) {
          setGoogleEvents(events);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load Google Calendar events.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingGoogleEvents(false);
        }
      }
    };
    loadGoogleEvents();
    return () => {
      cancelled = true;
    };
  }, [googleAccessToken]);

  useEffect(() => {
    let cancelled = false;
    const loadSchedule = async () => {
      if (!activeScheduleId) {
        setActiveScheduleDetail(undefined);
        setClasses([]);
        return;
      }
      // Verifying uploaded entries against Google Calendar makes this request noticeably
      // slower, so surface the same loading treatment the Calendar View uses.
      setIsLoadingSchedule(true);
      try {
        const [scheduleDetail, classesData, studentsData] = await Promise.all([
          api.getScheduleDetail(activeScheduleId, googleAccessToken),
          api.getClasses(activeScheduleId),
          api.getStudents(activeScheduleId),
        ]);
        if (cancelled) return;
        setActiveScheduleDetail(scheduleDetail);
        setClasses(classesData);
        setStudents(studentsData);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load schedule.');
      } finally {
        if (!cancelled) {
          setIsLoadingSchedule(false);
        }
      }
    };
    loadSchedule();
    return () => {
      cancelled = true;
    };
    // Re-runs once the Google token arrives so entries whose events were deleted in Google
    // Calendar are verified and reverted to "not uploaded".
  }, [activeScheduleId, googleAccessToken]);

  useEffect(() => {
    const load = async () => {
      if (!selected) {
        setStudentDetail(undefined);
        setClassDetail(undefined);
        setScheduledClassDetail(undefined);
        return;
      }

      // Calendar View entries are rendered from data already in memory (Google events and
      // local pending appointments). Class events do carry the ClassPlanner class id in their
      // Google extended properties though, so the schedule's class details can be shown.
      if (selected.type === 'calendarEntry') {
        setStudentDetail(undefined);
        setScheduledClassDetail(undefined);

        if (!selected.trainingClassId) {
          setClassDetail(undefined);
          return;
        }

        setDetailLoading(true);
        try {
          setClassDetail(await api.getClass(selected.trainingClassId));
        } catch {
          // The class may have been deleted from ClassPlanner while its Google event remains.
          setClassDetail(undefined);
        } finally {
          setDetailLoading(false);
        }
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
    if (selected) {
      if (selected.type === 'student') {
        setStudentDetail(await api.getStudent(selected.id));
      } else if (selected.type === 'class') {
        setClassDetail(await api.getClass(selected.id));
      } else if (selected.type === 'scheduledClass') {
        setScheduledClassDetail(await api.getScheduledClassDetail(selected.scheduleId, selected.entryId));
      }
    }
    // refresh summary lists to stay in sync
    const [studentsData, classesData] = await Promise.all([api.getStudents(activeScheduleId ?? undefined), api.getClasses(activeScheduleId ?? undefined)]);
    setStudents(studentsData);
    setClasses(classesData);
    // refresh the calendar's schedule entries (e.g. per-class enrollment counts) so the
    // schedule focus pane reflects new enrollments even when nothing is selected. No Google
    // token: verification is per-entry and too slow for an interactive drop.
    if (activeScheduleId) {
      setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId));
    }
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
      setStudents(await api.getStudents(activeScheduleId ?? undefined));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to schedule student.');
    }
  }

  /**
   * Creates a one-time appointment locally. It is flagged as unsaved and picked up by the
   * automatic sync below, which pushes it to Google Calendar.
   */
  function handleAddPendingAppointment(studentId: string, eventDate: string, startTime: string) {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    setPendingAppointments((prev) => [
      ...prev,
      {
        id: `pending:${crypto.randomUUID()}`,
        studentId,
        studentName: `${student.firstName} ${student.lastName} - One Time`,
        eventDate,
        startTime,
        duration: DEFAULT_APPOINTMENT_DURATION,
      },
    ]);
  }

  /**
   * Pushes every unsaved Calendar View change to Google Calendar: new appointments are created,
   * and edits to existing appointments update their event in place so no duplicate is made.
   * Runs automatically whenever unsaved work appears (see the effect below).
   */
  async function handleSyncPendingAppointments() {
    // Snapshot the work up front so the loops below are not affected by the state updates they
    // make, and so anything added mid-sync is left for the next run rather than being skipped.
    const appointmentsToCreate = pendingAppointments;
    const editedEventIds = Object.keys(googleEventEdits);
    if (appointmentsToCreate.length === 0 && editedEventIds.length === 0) return;
    // A ref rather than the state flag: state updates are not visible to a second call made in
    // the same render pass, which would let two syncs upload the same appointment twice.
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      for (const appointment of appointmentsToCreate) {
        const created = await api.createGoogleAppointment(
          appointment.studentId,
          appointment.eventDate,
          appointment.startTime,
          appointment.duration,
          googleAccessToken
        );
        setGoogleEvents((prev) => [...prev, created]);
        setPendingAppointments((prev) => prev.filter((p) => p.id !== appointment.id));
      }

      // Push edits to appointments that already exist on Google Calendar. These update the
      // existing event in place, so no duplicate is created.
      for (const eventId of editedEventIds) {
        const edit = googleEventEdits[eventId];
        const updated = await api.updateGoogleAppointment(
          eventId,
          edit.eventDate,
          edit.startTime,
          edit.duration,
          googleAccessToken
        );
        setGoogleEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
        setGoogleEventEdits((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
      }
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to sync appointments to Google Calendar.');
    } finally {
      isSyncingRef.current = false;
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
      // Refresh without the Google token: verifying every uploaded entry against Google issues
      // one API call per entry and makes dragging feel laggy. The move already flagged the
      // entry as needing sync server-side, and verification still runs on schedule load.
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
      // An uploaded entry is kept server-side as a tombstone so it can be shown as pending
      // removal, so refresh rather than relying on the optimistic filter above.
      setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId));
      setSchedules(await api.getSchedules());
      setStudents(await api.getStudents(activeScheduleId ?? undefined));
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
      setStudents(await api.getStudents(activeScheduleId ?? undefined));
      if (activeScheduleId) {
        setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId, googleAccessToken));
      }
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to delete class.');
    }
  }

  async function handleSaveStudent(
    studentId: string,
    firstName: string,
    lastName: string,
    email: string | null,
    phone: string | null,
    emergencyContact: string | null,
    notes: string | null
  ) {
    try {
      const updated = await api.updateStudent(studentId, firstName, lastName, email, phone, emergencyContact, notes);
      setStudentDetail(updated);
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, firstName: updated.firstName, lastName: updated.lastName } : s))
      );
      // A renamed student changes their appointment titles on Google, so entries may now be pending.
      if (activeScheduleId) {
        setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId, googleAccessToken));
      }
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to save student changes.');
    }
  }

  async function handleSaveClass(
    classId: string,
    name: string,
    description: string | null,
    notes: string | null
  ) {
    try {
      const updated = await api.updateClass(classId, name, description, notes);
      // Only drive the class focus pane when a class tile is what is actually selected. A
      // scheduled class entry can also edit class fields, and setting this would swap the
      // focus pane away from the entry the user is working on.
      if (selected?.type === 'class') {
        setClassDetail(updated);
      }
      setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, name: updated.name } : c)));
      if (selected?.type === 'scheduledClass') {
        setScheduledClassDetail(await api.getScheduledClassDetail(selected.scheduleId, selected.entryId));
      }
      // A renamed class changes its event titles on Google, so entries may now be pending.
      if (activeScheduleId) {
        setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId, googleAccessToken));
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
      const nextScheduleId = remaining[0]?.id ?? null;
      setActiveScheduleId(nextScheduleId);
      setSelected(null);
      setStudents(await api.getStudents(nextScheduleId ?? undefined));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to delete schedule.');
    }
  }

  async function handleSaveScheduleDates(startDate: string | null, endDate: string | null) {
    if (!activeScheduleId) return;
    try {
      const updated = await api.updateSchedule(activeScheduleId, startDate, endDate);
      setSchedules((prev) => prev.map((s) => (s.id === activeScheduleId ? updated : s)));
      setActiveScheduleDetail((prev) => (prev ? { ...prev, startDate: updated.startDate, endDate: updated.endDate } : prev));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to save schedule dates.');
    }
  }

  async function handleRenameSchedule(name: string) {
    if (!activeScheduleId) return;
    try {
      const updated = await api.renameSchedule(activeScheduleId, name);
      setSchedules((prev) => prev.map((s) => (s.id === activeScheduleId ? updated : s)));
      setActiveScheduleDetail((prev) => (prev ? { ...prev, name: updated.name } : prev));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to rename schedule.');
    }
  }

  async function handleCopySchedule() {
    if (!activeScheduleId) return;
    const activeSchedule = schedules.find((s) => s.id === activeScheduleId);
    let name = window.prompt('New schedule name', activeSchedule ? `Copy of ${activeSchedule.name}` : '');
    if (!name) return;

    while (true) {
      try {
        const copy = await api.copySchedule(activeScheduleId, name);
        setSchedules((prev) => [...prev, copy]);
        setActiveScheduleId(copy.id);
        setSelected(null);
        setStudents(await api.getStudents(copy.id));
        return;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          name = window.prompt(`${err.message} Enter a different name`, name);
          if (!name) return;
          continue;
        }
        showError(err instanceof ApiError ? err.message : 'Unable to copy schedule.');
        return;
      }
    }
  }

  async function handleUpdateGoogleCalendar() {
    if (!activeScheduleId || isUpdatingGoogleCalendar) return;
    setIsUpdatingGoogleCalendar(true);
    setGoogleSyncMessage(null);
    try {
      const result = await api.updateGoogleCalendar(activeScheduleId, googleAccessToken);
      setGoogleSyncMessage(
        `Google Calendar updated. Created: ${result.created}  Updated: ${result.updated}  Removed: ${result.deleted}`
      );
      // Entries now have Google event mappings, so refresh to clear their "not uploaded" styling.
      setActiveScheduleDetail(await api.getScheduleDetail(activeScheduleId, googleAccessToken));
      // The synced entries are now events on the Class Planner calendar, so reload them to keep
      // Calendar View in step with what was just uploaded.
      await refreshGoogleEvents();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Unable to update Google Calendar.');
    } finally {
      setIsUpdatingGoogleCalendar(false);
    }
  }

  // Converts the fetched Google Calendar events into pseudo schedule entries so they can be
  // rendered directly in the Calendar grid for the week currently shown in Calendar View.
  const googleCalendarViewEntries = useMemo<ScheduledClassEntry[]>(() => {
    if (viewMode !== 'calendar') {
      return [];
    }
    const weekStart = startOfWeek(calendarViewDate);
    const weekEnd = addDays(weekStart, 7);

    return googleEvents
      .filter((event) => {
        const eventDate = toIsoDate(new Date(event.start));
        return eventDate >= weekStart && eventDate < weekEnd;
      })
      .map((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const durationMinutes = Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0);
        const durationHours = Math.floor(durationMinutes / 60);
        const durationRemainder = durationMinutes % 60;

        // An unsaved local edit takes precedence over the values fetched from Google.
        const edit = googleEventEdits[event.id];

        return {
          id: `google:${event.id}`,
          scheduleId: '',
          trainingClassId: event.trainingClassId ?? null,
          trainingClassName: event.summary,
          enrollmentCount: null,
          studentId: event.studentId ?? null,
          studentName: null,
          dayOfWeek: new Date(`${edit?.eventDate ?? toIsoDate(start)}T00:00:00`).getDay() as DayOfWeekIndex,
          startTime:
            edit?.startTime ??
            `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}:00`,
          duration:
            edit?.duration ??
            `${durationHours.toString().padStart(2, '0')}:${durationRemainder.toString().padStart(2, '0')}:00`,
          location: event.location,
          recurrenceType: event.recurrenceType ?? 'Once',
          eventDate: edit?.eventDate ?? toIsoDate(start),
          isPending: Boolean(edit),
        } satisfies ScheduledClassEntry;
      });
  }, [viewMode, calendarViewDate, googleEvents, googleEventEdits]);

  // One-time appointments created via Calendar View drag-and-drop that have not yet been synced
  // to Google Calendar, filtered to the week currently shown. These are local-only and are not
  // associated with any ClassPlanner schedule.
  const localCalendarViewEntries = useMemo<ScheduledClassEntry[]>(() => {
    if (viewMode !== 'calendar') {
      return [];
    }

    const weekStart = startOfWeek(calendarViewDate);
    const weekEnd = addDays(weekStart, 7);

    return pendingAppointments
      .filter((appointment) => appointment.eventDate >= weekStart && appointment.eventDate < weekEnd)
      .map((appointment) => {
        const [hours, minutes] = appointment.startTime.split(':');
        return {
          id: appointment.id,
          scheduleId: '',
          trainingClassId: null,
          trainingClassName: null,
          enrollmentCount: null,
          studentId: appointment.studentId,
          studentName: appointment.studentName,
          dayOfWeek: new Date(`${appointment.eventDate}T00:00:00`).getDay() as DayOfWeekIndex,
          startTime: `${hours}:${minutes}:00`,
          duration: appointment.duration,
          location: null,
          recurrenceType: 'Once',
          eventDate: appointment.eventDate,
          isPending: true,
        } satisfies ScheduledClassEntry;
      });
  }, [viewMode, calendarViewDate, pendingAppointments]);

  const calendarViewEntries = useMemo<ScheduledClassEntry[]>(
    () => [...localCalendarViewEntries, ...googleCalendarViewEntries],
    [localCalendarViewEntries, googleCalendarViewEntries]
  );

  /**
   * Automatically uploads unsaved Calendar View work. Runs the same logic the manual upload
   * button used, triggered whenever a new appointment is added or an existing one is edited.
   *
   * Depends only on the unsaved work itself: including the in-progress flag would re-run this
   * when the sync finishes and retry immediately on failure, spinning in a loop.
   */
  useEffect(() => {
    if (!googleAccessToken) return;
    if (pendingAppointments.length === 0 && Object.keys(googleEventEdits).length === 0) return;
    handleSyncPendingAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on unsaved work only
  }, [pendingAppointments, googleEventEdits, googleAccessToken]);

  /**
   * True when the active schedule has entries that are not yet on Google Calendar, or entries
   * removed locally whose Google events still need deleting. Drives whether there is anything
   * for the Update Google Calendar action to do.
   */
  const hasScheduleChangesToUpload = useMemo(
    () => (activeScheduleDetail?.entries ?? []).some((e) => e.isPending || e.pendingDeletion),
    [activeScheduleDetail]
  );

  const selectedCalendarEntry = useMemo<ScheduledClassEntry | undefined>(
    () =>
      selected?.type === 'calendarEntry'
        ? calendarViewEntries.find((e) => e.id === selected.entryId)
        : undefined,
    [selected, calendarViewEntries]
  );

  /**
   * The student selected while in Calendar View, together with their entries in the week on
   * screen. Uses the summary list rather than fetching detail, since Calendar View reports what
   * is visible rather than all-time schedule data.
   */
  const selectedCalendarStudent = useMemo(() => {
    if (viewMode !== 'calendar' || selected?.type !== 'student') {
      return undefined;
    }
    const student = students.find((s) => s.id === selected.id);
    if (!student) {
      return undefined;
    }
    return {
      student,
      entries: calendarViewEntries.filter((e) => e.studentId === student.id),
    };
  }, [viewMode, selected, students, calendarViewEntries]);

  /**
   * Selects a Calendar View entry, carrying the ClassPlanner class id so the focus pane can
   * load the class details for class events.
   */
  function selectCalendarEntry(entryId: string) {
    const entry = calendarViewEntries.find((e) => e.id === entryId);
    setSelected({ type: 'calendarEntry', entryId, trainingClassId: entry?.trainingClassId ?? null });
  }

  /**
   * Saves a one-time appointment edited from Calendar View. The edit is recorded locally and
   * flagged as unsaved; the automatic sync below pushes it to Google Calendar.
   *
   * Each property commits individually, so the selection is kept to allow further edits.
   */
  function handleSaveCalendarEntry(
    entryId: string,
    eventDate: string,
    startTime: string,
    duration: string
  ) {
    if (!eventDate) return;

    if (entryId.startsWith('google:')) {
      const eventId = entryId.slice('google:'.length);
      setGoogleEventEdits((prev) => ({ ...prev, [eventId]: { eventDate, startTime, duration } }));
      setCalendarViewDate(eventDate);
      return;
    }

    setPendingAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === entryId ? { ...appointment, eventDate, startTime, duration } : appointment
      )
    );
    setCalendarViewDate(eventDate);
  }

  /**
   * Moves a one-time appointment to a different day/time by dragging it in Calendar View.
   * Classes and repeating appointments are ignored: they belong to a ClassPlanner schedule and
   * must be moved from the Schedule View so the whole series stays consistent.
   */
  function handleMoveCalendarEntry(entryId: string, eventDate: string, startTime: string) {
    const entry = calendarViewEntries.find((e) => e.id === entryId);
    if (!entry) return;

    const isClass = Boolean(entry.trainingClassId) || !entry.studentId;
    if (isClass || entry.recurrenceType !== 'Once') {
      showError('Only one-time appointments can be moved here. Classes and repeating appointments are managed in the Schedule View.');
      return;
    }

    handleSaveCalendarEntry(entryId, eventDate, startTime, entry.duration);
  }

  async function handleRemoveCalendarEntry(entryId: string) {
    // Keep a student selection in place so the list can be worked through; only clear the
    // selection when the removed entry itself was what the focus pane was showing.
    const clearSelection = () => {
      if (selected?.type === 'calendarEntry' && selected.entryId === entryId) {
        setSelected(null);
      }
    };

    if (entryId.startsWith('google:')) {
      const eventId = entryId.slice('google:'.length);
      try {
        await api.deleteGoogleAppointment(eventId, googleAccessToken);
        setGoogleEvents((prev) => prev.filter((e) => e.id !== eventId));
        // Drop any unsaved edit along with the appointment it belonged to.
        setGoogleEventEdits((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
        clearSelection();
      } catch (err) {
        showError(err instanceof ApiError ? err.message : 'Unable to remove appointment.');
      }
      return;
    }

    setPendingAppointments((prev) => prev.filter((appointment) => appointment.id !== entryId));
    clearSelection();
  }

  // Student tile counts.
  //
  // In Schedule View the counts come straight from the backend, scoped to the active schedule.
  // Google Calendar events and not-yet-uploaded Calendar View appointments are deliberately
  // excluded: they are not backed by a ClassPlanner ScheduledClass in the active schedule, so
  // including them would make the tiles disagree with the schedule grid beside them.
  //
  // In Calendar View the tiles instead report only what is visible in the week currently on
  // screen, so the counts always agree with the grid the user is looking at.
  const studentsWithAdHocCounts = useMemo<StudentSummary[]>(() => {
    if (viewMode !== 'calendar') {
      return students;
    }

    const visibleCounts = new Map<string, number>();
    for (const entry of calendarViewEntries) {
      if (entry.studentId) {
        visibleCounts.set(entry.studentId, (visibleCounts.get(entry.studentId) ?? 0) + 1);
      }
    }

    return students.map((student) => ({
      ...student,
      enrolledClassCount: 0,
      appointmentCount: visibleCounts.get(student.id) ?? 0,
    }));
  }, [students, viewMode, calendarViewEntries]);

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
      const date = overData.date as string | undefined;

      if (activeData?.type === 'class') {
        handleScheduleClass(activeData.classId as string, dayOfWeek, startTime);
      } else if (activeData?.type === 'student') {
        if (date) {
          handleAddPendingAppointment(activeData.studentId as string, date, startTime);
        } else {
          handleScheduleStudent(activeData.studentId as string, dayOfWeek, startTime);
        }
      } else if (activeData?.type === 'scheduled') {
        if (date) {
          // Calendar View slots carry a specific date, so this is a one-time appointment being
          // moved to another day/time rather than a weekly schedule entry.
          handleMoveCalendarEntry(activeData.entryId as string, date, startTime);
        } else {
          handleMoveScheduledClass(activeData.entryId as string, dayOfWeek, startTime);
        }
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app">
        <header className="tool-ribbon">
          <h1>Class Planner</h1>
          <button
            type="button"
            className="view-mode-toggle"
            onClick={() => {
              setViewMode((prev) => (prev === 'schedule' ? 'calendar' : 'schedule'));
              setSelected(null);
            }}
          >
            {viewMode === 'schedule' ? 'Calendar View' : 'Schedule View'}
          </button>
          <div className="google-status">
            {googleStatus.connected && (
              <span className="google-status-connected">
                Google Calendar Connected{googleStatus.email ? ` (${googleStatus.email})` : ''}
              </span>
            )}
            {!googleStatus.connected && googleUnavailableReason && (
              <span className="google-status-connected" title={googleUnavailableReason}>
                Google sign-in unavailable
              </span>
            )}
          </div>
        </header>

        {error && (
          <div className="app-error">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {googleSyncMessage && (
          <div className="app-info">
            <span>{googleSyncMessage}</span>
            <button type="button" onClick={() => setGoogleSyncMessage(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="app-main">
          <div className="top-pane">
            {viewMode === 'schedule' && (
              <>
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
                    <button type="button" onClick={handleCopySchedule}>
                      Copy Schedule
                    </button>
                  )}
                  {activeScheduleId && (
                    <button type="button" onClick={handleDeleteSchedule}>
                      Delete Schedule
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <aside className="left-pane">
            {viewMode === 'schedule' && (
              <>
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
                      isSelected={selected?.type === 'class' && selected.id === trainingClass.id}
                    />
                  ))}
                </div>
              </>
            )}
          </aside>

          <main className="focus-pane">
            {viewMode === 'calendar' ? (
              selectedCalendarEntry ? (
                <CalendarEntryDetails
                  key={selectedCalendarEntry.id}
                  entry={selectedCalendarEntry}
                  classDetail={classDetail}
                  loading={detailLoading}
                  onSave={handleSaveCalendarEntry}
                  onRemove={handleRemoveCalendarEntry}
                  onClose={() => setSelected(null)}
                />
              ) : selectedCalendarStudent ? (
                <CalendarStudentDetails
                  key={selectedCalendarStudent.student.id}
                  student={selectedCalendarStudent.student}
                  entries={selectedCalendarStudent.entries}
                  onSelectEntry={selectCalendarEntry}
                  onRemoveEntry={handleRemoveCalendarEntry}
                  onClose={() => setSelected(null)}
                />
              ) : (
                <Calendar
                  key="calendar-view"
                  entries={calendarViewEntries}
                  hours={HOURS}
                  onSelectEntry={selectCalendarEntry}
                  selectedEntryId={selected?.type === 'calendarEntry' ? selected.entryId : undefined}
                  canDragEntry={(entry) =>
                    Boolean(entry.studentId) && !entry.trainingClassId && entry.recurrenceType === 'Once'
                  }
                  viewDate={calendarViewDate}
                  onViewDateChange={setCalendarViewDate}
                  isLoading={isLoadingGoogleEvents}
                />
              )
            ) : classDetail && selected?.type === 'class' ? (
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
                key={activeScheduleDetail?.id ?? activeScheduleId ?? 'none'}
                entries={activeScheduleDetail?.entries ?? []}
                hours={HOURS}
                onSelectEntry={(entryId) =>
                  activeScheduleId && setSelected({ type: 'scheduledClass', scheduleId: activeScheduleId, entryId })
                }
                scheduleId={activeScheduleDetail?.id ?? activeScheduleId ?? undefined}
                scheduleName={activeScheduleDetail?.name}
                startDate={activeScheduleDetail?.startDate}
                endDate={activeScheduleDetail?.endDate}
                onSaveScheduleDates={activeScheduleId ? handleSaveScheduleDates : undefined}
                onRenameSchedule={activeScheduleId ? handleRenameSchedule : undefined}
                isLoading={isLoadingSchedule || isUpdatingGoogleCalendar}
                loadingMessage={isUpdatingGoogleCalendar ? 'Updating Google Calendar...' : 'Loading schedule...'}
                toolbarActions={
                  activeScheduleId ? (
                    <button
                      type="button"
                      className="calendar-update-google-calendar"
                      onClick={handleUpdateGoogleCalendar}
                      disabled={
                        !googleStatus.connected || isUpdatingGoogleCalendar || !hasScheduleChangesToUpload
                      }
                      title={
                        !googleStatus.connected
                          ? 'Connect Google Calendar to enable synchronization.'
                          : hasScheduleChangesToUpload
                            ? undefined
                            : 'This schedule is already up to date on Google Calendar.'
                      }
                    >
                      {isUpdatingGoogleCalendar ? 'Updating...' : 'Publish Schedule'}
                    </button>
                  ) : undefined
                }
              />
            )}
          </main>

          <aside className="right-pane">
            <h2>Students</h2>
            <button type="button" className="pane-section-action" onClick={handleCreateStudent}>
              New Student
            </button>
            <div className="tile-list">
              {studentsWithAdHocCounts.map((student) => (
                <StudentTile
                  key={student.id}
                  student={student}
                  onSelect={(id) => setSelected({ type: 'student', id })}
                  isSelected={selected?.type === 'student' && selected.id === student.id}
                  hideEnrolledClasses={viewMode === 'calendar'}
                />
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
