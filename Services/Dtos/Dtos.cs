namespace ClassPlanner.Services.Dtos;

using ClassPlanner.Models;

public class StudentSummaryDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public int EnrolledClassCount { get; set; }
    public int AppointmentCount { get; set; }
}

public class StudentDetailDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? EmergencyContact { get; set; }
    public string? Notes { get; set; }
    public List<ClassSummaryDto> EnrolledClasses { get; set; } = [];
    public List<ScheduledAppointmentSummaryDto> ScheduledAppointments { get; set; } = [];
}

/// <summary>A direct student appointment (no associated class) placed on a schedule.</summary>
public class ScheduledAppointmentSummaryDto
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public string ScheduleName { get; set; } = "";
    public string? Title { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan Duration { get; set; }
    public string? Location { get; set; }
    public RecurrenceType RecurrenceType { get; set; }
}

public class ClassSummaryDto
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public string ScheduleName { get; set; } = "";
    public string Name { get; set; } = "";
    public int EnrollmentCount { get; set; }
}

public class ClassDetailDto
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public Guid? InstructorId { get; set; }
    public int EnrollmentCount { get; set; }
    public string? Notes { get; set; }
    public List<StudentSummaryDto> EnrolledStudents { get; set; } = [];
}

public class ScheduleSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public int EntryCount { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}

public class ScheduledClassEntryDto
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public Guid? TrainingClassId { get; set; }
    public string? TrainingClassName { get; set; }
    public int? EnrollmentCount { get; set; }
    public Guid? StudentId { get; set; }
    public string? StudentName { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan Duration { get; set; }
    public string? Location { get; set; }
    public RecurrenceType RecurrenceType { get; set; }

    /// <summary>The specific calendar date this occurrence falls on. Only set when <see cref="RecurrenceType"/> is <see cref="Models.RecurrenceType.Once"/>.</summary>
    public DateOnly? EventDate { get; set; }

    /// <summary>
    /// True when this entry has not yet been pushed to Google Calendar, i.e. there is no
    /// <see cref="Models.GoogleCalendarEventMapping"/> for it yet.
    /// </summary>
    public bool IsPending { get; set; }

    /// <summary>
    /// True when this entry has been removed locally and its Google Calendar event will be
    /// deleted on the next upload.
    /// </summary>
    public bool PendingDeletion { get; set; }
}

public class ScheduleDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public List<ScheduledClassEntryDto> Entries { get; set; } = [];
}

public class ScheduledClassDetailDto
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public Guid? TrainingClassId { get; set; }
    public string? TrainingClassName { get; set; }
    public string? ClassDescription { get; set; }
    public string? ClassNotes { get; set; }
    public Guid? StudentId { get; set; }
    public string? StudentName { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan Duration { get; set; }
    public string? Location { get; set; }
    public RecurrenceType RecurrenceType { get; set; }
    public List<StudentSummaryDto> EnrolledStudents { get; set; } = [];
}

public class CreateScheduleRequest
{
    public string Name { get; set; } = "";
}

public class CopyScheduleRequest
{
    public string Name { get; set; } = "";
}

public class UpdateScheduleRequest
{
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}

public class RenameScheduleRequest
{
    public string Name { get; set; } = "";
}

public class CreateClassRequest
{
    public string Name { get; set; } = "";
}

public class UpdateClassRequest
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Notes { get; set; }
}

public class CreateStudentRequest
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
}

public class UpdateStudentRequest
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? EmergencyContact { get; set; }
    public string? Notes { get; set; }
}

public class CreateScheduledClassRequest
{
    public Guid TrainingClassId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
}

public class CreateScheduledStudentRequest
{
    public Guid StudentId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
}

/// <summary>Creates an ad-hoc one-time student appointment pushed directly to Google Calendar (not tied to any ClassPlanner schedule).</summary>
public class CreateGoogleAppointmentRequest
{
    public Guid StudentId { get; set; }
    public DateOnly EventDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan Duration { get; set; }
}

/// <summary>Updates the timing of an existing one-time appointment on the Class Planner calendar.</summary>
public class UpdateGoogleAppointmentRequest
{
    public DateOnly EventDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan Duration { get; set; }
}

public class MoveScheduledClassRequest
{
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? Duration { get; set; }
    public string? Location { get; set; }
}

public class GoogleCalendarStatusDto
{
    public bool Connected { get; set; }
    public string? Email { get; set; }
}

public class GoogleCalendarSyncResultDto
{
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Deleted { get; set; }
}

/// <summary>Public OAuth configuration used by the frontend to initialize the Google Identity Services popup token client.</summary>
public class GoogleCalendarConfigDto
{
    public string ClientId { get; set; } = "";
    public string Scope { get; set; } = "";
}

/// <summary>Plain, read-only view of a Google Calendar event for display purposes only (no reconciliation/merge with ClassPlanner data).</summary>
public class GoogleCalendarEventDto
{
    public string Id { get; set; } = "";
    public string Summary { get; set; } = "";
    public string? Description { get; set; }
    public string? Location { get; set; }
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    /// <summary>The ClassPlanner student this event represents, when the event was created for a student appointment.</summary>
    public Guid? StudentId { get; set; }
    /// <summary>The ClassPlanner class this event represents, when the event was created for a scheduled class.</summary>
    public Guid? TrainingClassId { get; set; }
    /// <summary>How the event repeats, when ClassPlanner recorded it. Repeating events are not editable from Calendar View.</summary>
    public RecurrenceType? RecurrenceType { get; set; }
}

