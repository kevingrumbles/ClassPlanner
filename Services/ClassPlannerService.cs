using ClassPlanner.Models;
using ClassPlanner.Persistence;
using ClassPlanner.Services.Dtos;

namespace ClassPlanner.Services;

/// <summary>
/// Application service that implements Class Planner business rules.
/// Controllers call into this service; it is the only layer (besides <see cref="IDataStore"/>)
/// that touches persisted data. The backend is authoritative for all business rules.
/// </summary>
public class ClassPlannerService(IDataStore dataStore, ILogger<ClassPlannerService> logger)
{
    public async Task<List<StudentSummaryDto>> GetStudentsAsync()
    {
        var students = await dataStore.GetStudentsAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();

        return students
            .Select(s => new StudentSummaryDto
            {
                Id = s.Id,
                FirstName = s.FirstName,
                LastName = s.LastName,
                EnrolledClassCount = enrollments.Count(e => e.StudentId == s.Id)
            })
            .ToList();
    }

    public async Task<StudentDetailDto?> GetStudentDetailAsync(Guid id)
    {
        var student = await dataStore.GetStudentAsync(id);
        if (student is null)
        {
            return null;
        }

        var classes = await dataStore.GetClassesAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();
        var enrolledClassIds = enrollments.Where(e => e.StudentId == id).Select(e => e.TrainingClassId).ToHashSet();

        return new StudentDetailDto
        {
            Id = student.Id,
            FirstName = student.FirstName,
            LastName = student.LastName,
            Email = student.Email,
            Phone = student.Phone,
            Notes = student.Notes,
            EnrolledClasses = classes
                .Where(c => enrolledClassIds.Contains(c.Id))
                .Select(c => ToClassSummary(c, enrollments))
                .ToList()
        };
    }

    public async Task<List<ClassSummaryDto>> GetClassesAsync()
    {
        var classes = await dataStore.GetClassesAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();
        return classes.Select(c => ToClassSummary(c, enrollments)).ToList();
    }

    public async Task<ClassDetailDto?> GetClassDetailAsync(Guid id)
    {
        var trainingClass = await dataStore.GetClassAsync(id);
        if (trainingClass is null)
        {
            return null;
        }

        var students = await dataStore.GetStudentsAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();
        var enrolledStudentIds = enrollments.Where(e => e.TrainingClassId == id).Select(e => e.StudentId).ToHashSet();

        return new ClassDetailDto
        {
            Id = trainingClass.Id,
            Name = trainingClass.Name,
            Description = trainingClass.Description,
            InstructorId = trainingClass.InstructorId,
            MaximumStudents = trainingClass.MaximumStudents,
            EnrollmentCount = enrolledStudentIds.Count,
            Duration = trainingClass.Duration,
            Location = trainingClass.Location,
            Notes = trainingClass.Notes,
            EnrolledStudents = students
                .Where(s => enrolledStudentIds.Contains(s.Id))
                .Select(s => ToStudentSummary(s, enrollments))
                .ToList()
        };
    }

    public async Task<List<StudentSummaryDto>?> GetClassStudentsAsync(Guid classId)
    {
        var trainingClass = await dataStore.GetClassAsync(classId);
        if (trainingClass is null)
        {
            return null;
        }

        var students = await dataStore.GetStudentsAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();
        var enrolledStudentIds = enrollments.Where(e => e.TrainingClassId == classId).Select(e => e.StudentId).ToHashSet();

        return students
            .Where(s => enrolledStudentIds.Contains(s.Id))
            .Select(s => ToStudentSummary(s, enrollments))
            .ToList();
    }

    public async Task EnrollStudentAsync(Guid classId, Guid studentId)
    {
        var student = await dataStore.GetStudentAsync(studentId);
        if (student is null)
        {
            throw new ClassPlannerNotFoundException("Student was not found.");
        }

        var trainingClass = await dataStore.GetClassAsync(classId);
        if (trainingClass is null)
        {
            throw new ClassPlannerNotFoundException("Class was not found.");
        }

        var enrollments = await dataStore.GetEnrollmentsAsync();

        if (enrollments.Any(e => e.StudentId == studentId && e.TrainingClassId == classId))
        {
            throw new ClassPlannerConflictException($"{student.FirstName} {student.LastName} is already enrolled in {trainingClass.Name}.");
        }

        var currentEnrollmentCount = enrollments.Count(e => e.TrainingClassId == classId);
        if (currentEnrollmentCount >= trainingClass.MaximumStudents)
        {
            throw new ClassPlannerConflictException($"{trainingClass.Name} is already full.");
        }

        enrollments.Add(new Enrollment
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TrainingClassId = classId,
            CreatedAtUtc = DateTime.UtcNow
        });

        await dataStore.SaveEnrollmentsAsync(enrollments);
        logger.LogInformation("Enrollment created for class {ClassId}", classId);
    }

    public async Task RemoveStudentFromClassAsync(Guid classId, Guid studentId)
    {
        var enrollments = await dataStore.GetEnrollmentsAsync();
        var enrollment = enrollments.FirstOrDefault(e => e.StudentId == studentId && e.TrainingClassId == classId);
        if (enrollment is null)
        {
            throw new ClassPlannerNotFoundException("Enrollment was not found.");
        }

        enrollments.Remove(enrollment);
        await dataStore.SaveEnrollmentsAsync(enrollments);
        logger.LogInformation("Enrollment removed for class {ClassId}", classId);
    }

    public async Task<List<ScheduleDto>> GetScheduleAsync()
    {
        var schedules = await dataStore.GetSchedulesAsync();
        var classes = await dataStore.GetClassesAsync();
        return schedules.Select(s => ToScheduleDto(s, classes)).ToList();
    }

    public async Task<ScheduleDetailDto?> GetScheduleDetailAsync(Guid id)
    {
        var schedules = await dataStore.GetSchedulesAsync();
        var schedule = schedules.FirstOrDefault(s => s.Id == id);
        if (schedule is null)
        {
            return null;
        }

        var trainingClass = await dataStore.GetClassAsync(schedule.TrainingClassId);
        var students = await dataStore.GetStudentsAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();
        var enrolledStudentIds = enrollments
            .Where(e => e.TrainingClassId == schedule.TrainingClassId)
            .Select(e => e.StudentId)
            .ToHashSet();

        return new ScheduleDetailDto
        {
            Id = schedule.Id,
            TrainingClassId = schedule.TrainingClassId,
            TrainingClassName = trainingClass?.Name ?? "Unknown class",
            StartTime = schedule.StartTime,
            Duration = schedule.Duration,
            Location = schedule.Location,
            EnrolledStudents = students
                .Where(s => enrolledStudentIds.Contains(s.Id))
                .Select(s => ToStudentSummary(s, enrollments))
                .ToList()
        };
    }

    public async Task<ScheduleDto> ScheduleClassAsync(Guid trainingClassId, DateTime startTime)
    {
        var trainingClass = await dataStore.GetClassAsync(trainingClassId);
        if (trainingClass is null)
        {
            throw new ClassPlannerNotFoundException("Class was not found.");
        }

        var schedules = await dataStore.GetSchedulesAsync();
        var schedule = new ClassSchedule
        {
            Id = Guid.NewGuid(),
            TrainingClassId = trainingClassId,
            StartTime = startTime,
            Duration = trainingClass.Duration,
            Location = trainingClass.Location
        };

        schedules.Add(schedule);
        await dataStore.SaveSchedulesAsync(schedules);
        logger.LogInformation("Class scheduled for {ClassId}", trainingClassId);

        return ToScheduleDto(schedule, [trainingClass]);
    }

    public async Task<ScheduleDto> MoveScheduledClassAsync(Guid scheduleId, DateTime startTime)
    {
        var schedules = await dataStore.GetSchedulesAsync();
        var schedule = schedules.FirstOrDefault(s => s.Id == scheduleId);
        if (schedule is null)
        {
            throw new ClassPlannerNotFoundException("Scheduled class was not found.");
        }

        schedule.StartTime = startTime;
        await dataStore.SaveSchedulesAsync(schedules);
        logger.LogInformation("Class moved for schedule {ScheduleId}", scheduleId);

        var classes = await dataStore.GetClassesAsync();
        return ToScheduleDto(schedule, classes);
    }

    public async Task RemoveScheduledClassAsync(Guid scheduleId)
    {
        var schedules = await dataStore.GetSchedulesAsync();
        var schedule = schedules.FirstOrDefault(s => s.Id == scheduleId);
        if (schedule is null)
        {
            throw new ClassPlannerNotFoundException("Scheduled class was not found.");
        }

        schedules.Remove(schedule);
        await dataStore.SaveSchedulesAsync(schedules);
        logger.LogInformation("Scheduled class removed for schedule {ScheduleId}", scheduleId);
    }

    private static ClassSummaryDto ToClassSummary(TrainingClass trainingClass, List<Enrollment> enrollments) => new()
    {
        Id = trainingClass.Id,
        Name = trainingClass.Name,
        MaximumStudents = trainingClass.MaximumStudents,
        EnrollmentCount = enrollments.Count(e => e.TrainingClassId == trainingClass.Id),
        Duration = trainingClass.Duration
    };

    private static StudentSummaryDto ToStudentSummary(Student student, List<Enrollment> enrollments) => new()
    {
        Id = student.Id,
        FirstName = student.FirstName,
        LastName = student.LastName,
        EnrolledClassCount = enrollments.Count(e => e.StudentId == student.Id)
    };

    private static ScheduleDto ToScheduleDto(ClassSchedule schedule, List<TrainingClass> classes) => new()
    {
        Id = schedule.Id,
        TrainingClassId = schedule.TrainingClassId,
        TrainingClassName = classes.FirstOrDefault(c => c.Id == schedule.TrainingClassId)?.Name ?? "Unknown class",
        StartTime = schedule.StartTime,
        Duration = schedule.Duration,
        Location = schedule.Location
    };

    /// <summary>
    /// Populates the JSON data files with sample data if they are currently empty.
    /// Existing data is never overwritten.
    /// </summary>
    public async Task SeedDataIfEmptyAsync()
    {
        var students = await dataStore.GetStudentsAsync();
        if (students.Count == 0)
        {
            students =
            [
                new Student { Id = Guid.NewGuid(), FirstName = "Alice", LastName = "Smith", Email = "alice.smith@example.com" },
                new Student { Id = Guid.NewGuid(), FirstName = "Bob", LastName = "Jones", Email = "bob.jones@example.com" },
                new Student { Id = Guid.NewGuid(), FirstName = "Charlie", LastName = "Brown", Email = "charlie.brown@example.com" },
                new Student { Id = Guid.NewGuid(), FirstName = "David", LastName = "Wilson", Email = "david.wilson@example.com" },
                new Student { Id = Guid.NewGuid(), FirstName = "Emily", LastName = "Davis", Email = "emily.davis@example.com" },
                new Student { Id = Guid.NewGuid(), FirstName = "Frank", LastName = "Miller", Email = "frank.miller@example.com" }
            ];
            await dataStore.SaveStudentsAsync(students);
            logger.LogInformation("Seeded default students");
        }

        var classes = await dataStore.GetClassesAsync();
        if (classes.Count == 0)
        {
            classes =
            [
                new TrainingClass { Id = Guid.NewGuid(), Name = "Agility 101", MaximumStudents = 8, Duration = TimeSpan.FromMinutes(60), Location = "Field A" },
                new TrainingClass { Id = Guid.NewGuid(), Name = "Advanced Agility", MaximumStudents = 6, Duration = TimeSpan.FromMinutes(60), Location = "Field A" },
                new TrainingClass { Id = Guid.NewGuid(), Name = "Puppy Foundations", MaximumStudents = 10, Duration = TimeSpan.FromMinutes(45), Location = "Field B" },
                new TrainingClass { Id = Guid.NewGuid(), Name = "Basic Obedience", MaximumStudents = 8, Duration = TimeSpan.FromMinutes(60), Location = "Field B" },
                new TrainingClass { Id = Guid.NewGuid(), Name = "Jumping Skills", MaximumStudents = 6, Duration = TimeSpan.FromMinutes(60), Location = "Field A" },
                new TrainingClass { Id = Guid.NewGuid(), Name = "Handling Workshop", MaximumStudents = 12, Duration = TimeSpan.FromMinutes(90), Location = "Field C" }
            ];
            await dataStore.SaveClassesAsync(classes);
            logger.LogInformation("Seeded default classes");
        }

        var enrollments = await dataStore.GetEnrollmentsAsync();
        if (enrollments.Count == 0)
        {
            enrollments =
            [
                new Enrollment { Id = Guid.NewGuid(), StudentId = students[0].Id, TrainingClassId = classes[0].Id, CreatedAtUtc = DateTime.UtcNow },
                new Enrollment { Id = Guid.NewGuid(), StudentId = students[1].Id, TrainingClassId = classes[0].Id, CreatedAtUtc = DateTime.UtcNow },
                new Enrollment { Id = Guid.NewGuid(), StudentId = students[2].Id, TrainingClassId = classes[2].Id, CreatedAtUtc = DateTime.UtcNow },
                new Enrollment { Id = Guid.NewGuid(), StudentId = students[0].Id, TrainingClassId = classes[3].Id, CreatedAtUtc = DateTime.UtcNow },
                new Enrollment { Id = Guid.NewGuid(), StudentId = students[3].Id, TrainingClassId = classes[4].Id, CreatedAtUtc = DateTime.UtcNow }
            ];
            await dataStore.SaveEnrollmentsAsync(enrollments);
            logger.LogInformation("Seeded default enrollments");
        }

        var schedules = await dataStore.GetSchedulesAsync();
        if (schedules.Count == 0)
        {
            var monday = StartOfCurrentWeek();
            schedules =
            [
                new ClassSchedule { Id = Guid.NewGuid(), TrainingClassId = classes[0].Id, StartTime = monday.AddHours(9), Duration = classes[0].Duration, Location = classes[0].Location },
                new ClassSchedule { Id = Guid.NewGuid(), TrainingClassId = classes[2].Id, StartTime = monday.AddDays(1).AddHours(10), Duration = classes[2].Duration, Location = classes[2].Location },
                new ClassSchedule { Id = Guid.NewGuid(), TrainingClassId = classes[4].Id, StartTime = monday.AddDays(2).AddHours(13), Duration = classes[4].Duration, Location = classes[4].Location }
            ];
            await dataStore.SaveSchedulesAsync(schedules);
            logger.LogInformation("Seeded default schedules");
        }
    }

    private static DateTime StartOfCurrentWeek()
    {
        var today = DateTime.Today;
        var diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
        return today.AddDays(-diff);
    }
}
