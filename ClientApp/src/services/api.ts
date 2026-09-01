import type {
  ClassDetail,
  ClassSummary,
  DayOfWeekIndex,
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

export function getStudents(): Promise<StudentSummary[]> {
  return request('/api/students');
}

export function getStudent(id: string): Promise<StudentDetail> {
  return request(`/api/students/${id}`);
}

export function getClasses(scheduleId?: string): Promise<ClassSummary[]> {
  return request(scheduleId ? `/api/classes?scheduleId=${scheduleId}` : '/api/classes');
}

export function getClass(id: string): Promise<ClassDetail> {
  return request(`/api/classes/${id}`);
}

export function getSchedules(): Promise<ScheduleSummary[]> {
  return request('/api/schedules');
}

export function getScheduleDetail(scheduleId: string): Promise<ScheduleDetail> {
  return request(`/api/schedules/${scheduleId}`);
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

export function moveScheduledClass(
  scheduleId: string,
  entryId: string,
  dayOfWeek: DayOfWeekIndex,
  startTime: string
): Promise<ScheduledClassEntry> {
  return request(`/api/schedules/${scheduleId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify({ dayOfWeek, startTime }),
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


