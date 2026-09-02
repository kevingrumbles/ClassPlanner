namespace ClassPlanner.Services.Dtos;

public class StudentSummaryDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public int EnrolledClassCount { get; set; }
}

public class StudentDetailDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public List<ClassSummaryDto> EnrolledClasses { get; set; } = [];
}

public class ClassSummaryDto
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
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
}

public class ScheduleDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
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
    public List<StudentSummaryDto> EnrolledStudents { get; set; } = [];
}

public class CreateScheduleRequest
{
    public string Name { get; set; } = "";
}

public class CreateClassRequest
{
    public string Name { get; set; } = "";
}

public class UpdateClassRequest
{
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
    public string? Email { get; set; }
    public string? Phone { get; set; }
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
