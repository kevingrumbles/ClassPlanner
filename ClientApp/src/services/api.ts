import type {
  ClassDetail,
  ClassSummary,
  DayOfWeekIndex,
  GoogleCalendarConfig,
  GoogleCalendarEvent,
  GoogleCalendarStatus,
  GoogleCalendarSyncResult,
  ScheduleDetail,
  ScheduledClassDetail,
  ScheduledClassEntry,
  ScheduleSummary,
  StudentDetail,
  StudentSummary,
} from '../types/models';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function authHeader(accessToken: string | null): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = await response.json();
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // ignore body parse failures, fall back to default message
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getStudents(scheduleId?: string): Promise<StudentSummary[]> {
  return request(scheduleId ? `/api/students?scheduleId=${scheduleId}` : '/api/students');
}

export function getStudent(id: string): Promise<StudentDetail> {
  return request(`/api/students/${id}`);
}

export function createStudent(firstName: string, lastName: string): Promise<StudentSummary> {
  return request('/api/students', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName }),
  });
}

export function deleteStudent(id: string): Promise<void> {
  return request(`/api/students/${id}`, { method: 'DELETE' });
}

export function updateStudent(
  id: string,
  firstName: string,
  lastName: string,
  email: string | null,
  phone: string | null,
  emergencyContact: string | null,
  notes: string | null
): Promise<StudentDetail> {
  return request(`/api/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ firstName, lastName, email, phone, emergencyContact, notes }),
  });
}

export function getClasses(scheduleId?: string): Promise<ClassSummary[]> {
  return request(scheduleId ? `/api/classes?scheduleId=${scheduleId}` : '/api/classes');
}

export function createClass(scheduleId: string, name: string): Promise<ClassSummary> {
  return request(`/api/classes?scheduleId=${scheduleId}`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getClass(id: string): Promise<ClassDetail> {
  return request(`/api/classes/${id}`);
}

export function updateClass(
  id: string,
  name: string,
  description: string | null,
  notes: string | null
): Promise<ClassDetail> {
  return request(`/api/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description, notes }),
  });
}

export function deleteClass(id: string): Promise<void> {
  return request(`/api/classes/${id}`, { method: 'DELETE' });
}

export function getSchedules(): Promise<ScheduleSummary[]> {
  return request('/api/schedules');
}

export function getScheduleDetail(scheduleId: string, accessToken?: string | null): Promise<ScheduleDetail> {
  return request(`/api/schedules/${scheduleId}`, { headers: authHeader(accessToken ?? null) });
}

export function createSchedule(name: string): Promise<ScheduleSummary> {
  return request('/api/schedules', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function deleteSchedule(scheduleId: string): Promise<void> {
  return request(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
}

export function copySchedule(scheduleId: string, name: string): Promise<ScheduleSummary> {
  return request(`/api/schedules/${scheduleId}/copy`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function updateSchedule(
  scheduleId: string,
  startDate: string | null,
  endDate: string | null
): Promise<ScheduleSummary> {
  return request(`/api/schedules/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify({ startDate, endDate }),
  });
}

export function renameSchedule(scheduleId: string, name: string): Promise<ScheduleSummary> {
  return request(`/api/schedules/${scheduleId}/name`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export function getScheduledClassDetail(scheduleId: string, entryId: string): Promise<ScheduledClassDetail> {
  return request(`/api/schedules/${scheduleId}/entries/${entryId}`);
}

export function scheduleClass(
  scheduleId: string,
  trainingClassId: string,
  dayOfWeek: DayOfWeekIndex,
  startTime: string
): Promise<ScheduledClassEntry> {
  return request(`/api/schedules/${scheduleId}/entries`, {
    method: 'POST',
    body: JSON.stringify({ trainingClassId, dayOfWeek, startTime }),
  });
}

export function scheduleStudent(
  scheduleId: string,
  studentId: string,
  dayOfWeek: DayOfWeekIndex,
  startTime: string
): Promise<ScheduledClassEntry> {
  return request(`/api/schedules/${scheduleId}/entries/student`, {
    method: 'POST',
    body: JSON.stringify({ studentId, dayOfWeek, startTime }),
  });
}

export function moveScheduledClass(
  scheduleId: string,
  entryId: string,
  dayOfWeek: DayOfWeekIndex,
  startTime: string,
  duration?: string,
  location?: string | null
): Promise<ScheduledClassEntry> {
  return request(`/api/schedules/${scheduleId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify({ dayOfWeek, startTime, duration, location }),
  });
}

export function removeScheduledClass(scheduleId: string, entryId: string): Promise<void> {
  return request(`/api/schedules/${scheduleId}/entries/${entryId}`, { method: 'DELETE' });
}

export function enrollStudent(classId: string, studentId: string): Promise<void> {
  return request(`/api/classes/${classId}/students/${studentId}`, { method: 'POST' });
}

export function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  return request(`/api/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
}

export function getGoogleConfig(): Promise<GoogleCalendarConfig> {
  return request('/api/google/config');
}

export function getGoogleStatus(accessToken: string | null): Promise<GoogleCalendarStatus> {
  return request('/api/google/status', { headers: authHeader(accessToken) });
}

export function updateGoogleCalendar(scheduleId: string, accessToken: string | null): Promise<GoogleCalendarSyncResult> {
  return request(`/api/schedules/${scheduleId}/google-calendar`, {
    method: 'POST',
    headers: authHeader(accessToken),
  });
}

export function getGoogleEvents(accessToken: string | null): Promise<GoogleCalendarEvent[]> {
  return request('/api/google/events', { headers: authHeader(accessToken) });
}

export function updateGoogleAppointment(
  eventId: string,
  eventDate: string,
  startTime: string,
  duration: string,
  accessToken: string | null
): Promise<GoogleCalendarEvent> {
  return request(`/api/google/events/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    headers: authHeader(accessToken),
    body: JSON.stringify({ eventDate, startTime, duration }),
  });
}

export function deleteGoogleAppointment(eventId: string, accessToken: string | null): Promise<void> {
  return request(`/api/google/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: authHeader(accessToken),
  });
}

export function createGoogleAppointment(
  studentId: string,
  eventDate: string,
  startTime: string,
  duration: string,
  accessToken: string | null
): Promise<GoogleCalendarEvent> {
  return request('/api/google/events', {
    method: 'POST',
    headers: authHeader(accessToken),
    body: JSON.stringify({ studentId, eventDate, startTime, duration }),
  });
}


