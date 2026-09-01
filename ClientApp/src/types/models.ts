export interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  enrolledClassCount: number;
}

export interface ClassSummary {
  id: string;
  name: string;
  maximumStudents: number;
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
  name: string;
  description?: string | null;
  instructorId?: string | null;
  maximumStudents: number;
  enrollmentCount: number;
  duration: string;
  location?: string | null;
  notes?: string | null;
  enrolledStudents: StudentSummary[];
}

export interface ScheduleEntry {
  id: string;
  trainingClassId: string;
  trainingClassName: string;
  startTime: string; // ISO date-time
  duration: string;
  location?: string | null;
}

export interface ScheduleDetail extends ScheduleEntry {
  enrolledStudents: StudentSummary[];
}

export interface ApiErrorResponse {
  message: string;
}

export type SelectedObject =
  | { type: 'student'; id: string }
  | { type: 'class'; id: string }
  | { type: 'schedule'; id: string }
  | null;
