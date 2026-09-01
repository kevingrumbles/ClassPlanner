import type {
  ClassDetail,
  ClassSummary,
  ScheduleDetail,
  ScheduleEntry,
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

export function getClasses(): Promise<ClassSummary[]> {
  return request('/api/classes');
}

export function getClass(id: string): Promise<ClassDetail> {
  return request(`/api/classes/${id}`);
}

export function getSchedule(): Promise<ScheduleEntry[]> {
  return request('/api/schedule');
}

export function getScheduleDetail(id: string): Promise<ScheduleDetail> {
  return request(`/api/schedule/${id}`);
}

export function enrollStudent(classId: string, studentId: string): Promise<void> {
  return request(`/api/classes/${classId}/students/${studentId}`, { method: 'POST' });
}

export function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  return request(`/api/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
}

export function scheduleClass(trainingClassId: string, startTime: string): Promise<ScheduleEntry> {
  return request('/api/schedule', {
    method: 'POST',
    body: JSON.stringify({ trainingClassId, startTime }),
  });
}

export function moveScheduledClass(scheduleId: string, startTime: string): Promise<ScheduleEntry> {
  return request(`/api/schedule/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify({ startTime }),
  });
}

export function removeScheduledClass(scheduleId: string): Promise<void> {
  return request(`/api/schedule/${scheduleId}`, { method: 'DELETE' });
}
