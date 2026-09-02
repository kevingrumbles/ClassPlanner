export interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  enrolledClassCount: number;
}

export interface ClassSummary {
  id: string;
  scheduleId: string;
  name: string;
  enrollmentCount: number;
  duration: string; // ISO 8601 duration (TimeSpan serialized by System.Text.Json, e.g. "01:00:00")
}

export interface StudentDetail {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  enrolledClasses: ClassSummary[];
}

export interface ClassDetail {
  id: string;
  scheduleId: string;
  name: string;
  description?: string | null;
  instructorId?: string | null;
  enrollmentCount: number;
  duration: string;
  notes?: string | null;
  enrolledStudents: StudentSummary[];
}

/**
 * Matches .NET's System.DayOfWeek enum values as serialized by System.Text.Json
 * (0 = Sunday ... 6 = Saturday), which also matches JavaScript's Date.getDay().
 */
export type DayOfWeekIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleSummary {
  id: string;
  name: string;
  entryCount: number;
}

export interface ScheduledClassEntry {
  id: string;
  scheduleId: string;
  trainingClassId?: string | null;
  trainingClassName?: string | null;
  enrollmentCount?: number | null;
  studentId?: string | null;
  studentName?: string | null;
  dayOfWeek: DayOfWeekIndex;
  startTime: string; // TimeSpan serialized as "hh:mm:ss"
  duration: string;
  location?: string | null;
}

export interface ScheduleDetail {
  id: string;
  name: string;
  entries: ScheduledClassEntry[];
}

export interface ScheduledClassDetail extends ScheduledClassEntry {
  enrolledStudents: StudentSummary[];
}

export interface ApiErrorResponse {
  message: string;
}

export type SelectedObject =
  | { type: 'student'; id: string }
  | { type: 'class'; id: string }
  | { type: 'scheduledClass'; scheduleId: string; entryId: string }
  | null;
