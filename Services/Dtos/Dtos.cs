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

