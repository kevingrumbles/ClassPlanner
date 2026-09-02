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

    public async Task<StudentSummaryDto> CreateStudentAsync(string firstName, string lastName)
    {
        var students = await dataStore.GetStudentsAsync();
        var student = new Student { Id = Guid.NewGuid(), FirstName = firstName, LastName = lastName };
        students.Add(student);
        await dataStore.SaveStudentsAsync(students);
        logger.LogInformation("Student created {StudentId}", student.Id);
        return new StudentSummaryDto { Id = student.Id, FirstName = student.FirstName, LastName = student.LastName, EnrolledClassCount = 0 };
    }

    public async Task<StudentDetailDto> UpdateStudentAsync(Guid studentId, string? email, string? phone, string? notes)
    {
        var students = await dataStore.GetStudentsAsync();
        var student = students.FirstOrDefault(s => s.Id == studentId);
        if (student is null)
        {
            throw new ClassPlannerNotFoundException("Student was not found.");
        }

        student.Email = email;
        student.Phone = phone;
        student.Notes = notes;
        await dataStore.SaveStudentsAsync(students);
        logger.LogInformation("Student updated {StudentId}", studentId);

        var detail = await GetStudentDetailAsync(studentId);
        return detail!;
    }

    public async Task DeleteStudentAsync(Guid studentId)
    {
        var students = await dataStore.GetStudentsAsync();
        var student = students.FirstOrDefault(s => s.Id == studentId);
        if (student is null)
        {
            throw new ClassPlannerNotFoundException("Student was not found.");
        }

        students.Remove(student);
        await dataStore.SaveStudentsAsync(students);

        var enrollments = await dataStore.GetEnrollmentsAsync();
        enrollments.RemoveAll(e => e.StudentId == studentId);
        await dataStore.SaveEnrollmentsAsync(enrollments);

        logger.LogInformation("Student deleted {StudentId}", studentId);
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

    public async Task<ClassSummaryDto> CreateClassAsync(Guid scheduleId, string name)
    {
        var schedule = await dataStore.GetScheduleAsync(scheduleId);
        if (schedule is null)
        {
            throw new ClassPlannerNotFoundException("Schedule was not found.");
        }

        var classes = await dataStore.GetClassesAsync();
        var trainingClass = new TrainingClass
        {
            Id = Guid.NewGuid(),
            ScheduleId = scheduleId,
            Name = name
        };
        classes.Add(trainingClass);
        await dataStore.SaveClassesAsync(classes);
        logger.LogInformation("Class created {ClassId}", trainingClass.Id);
        return ToClassSummary(trainingClass, []);
    }

    public async Task<ClassDetailDto> UpdateClassAsync(Guid classId, string? description, string? notes)
    {
        var classes = await dataStore.GetClassesAsync();
        var trainingClass = classes.FirstOrDefault(c => c.Id == classId);
        if (trainingClass is null)
        {
            throw new ClassPlannerNotFoundException("Class was not found.");
        }

        trainingClass.Description = description;
        trainingClass.Notes = notes;
        await dataStore.SaveClassesAsync(classes);
        logger.LogInformation("Class updated {ClassId}", classId);

        var detail = await GetClassDetailAsync(classId);
        return detail!;
    }

    public async Task<List<ClassSummaryDto>> GetClassesAsync(Guid? scheduleId = null)
    {
        var classes = await dataStore.GetClassesAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();
        if (scheduleId.HasValue)
        {
            classes = classes.Where(c => c.ScheduleId == scheduleId.Value).ToList();
        }
        return classes.Select(c => ToClassSummary(c, enrollments)).ToList();
    }

    public async Task DeleteClassAsync(Guid classId)
    {
        var classes = await dataStore.GetClassesAsync();
        var trainingClass = classes.FirstOrDefault(c => c.Id == classId);
        if (trainingClass is null)
        {
            throw new ClassPlannerNotFoundException("Class was not found.");
        }

        classes.Remove(trainingClass);
        await dataStore.SaveClassesAsync(classes);

        var enrollments = await dataStore.GetEnrollmentsAsync();
        enrollments.RemoveAll(e => e.TrainingClassId == classId);
        await dataStore.SaveEnrollmentsAsync(enrollments);

        var scheduledClasses = await dataStore.GetScheduledClassesAsync();
        scheduledClasses.RemoveAll(e => e.TrainingClassId == classId);
        await dataStore.SaveScheduledClassesAsync(scheduledClasses);

        logger.LogInformation("Class deleted {ClassId}", classId);
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
            ScheduleId = trainingClass.ScheduleId,
            Name = trainingClass.Name,
            Description = trainingClass.Description,
            InstructorId = trainingClass.InstructorId,
            EnrollmentCount = enrolledStudentIds.Count,
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

    public async Task<List<ScheduleSummaryDto>> GetSchedulesAsync()
    {
        var schedules = await dataStore.GetSchedulesAsync();
        var entries = await dataStore.GetScheduledClassesAsync();
        return schedules
            .Select(s => new ScheduleSummaryDto
            {
                Id = s.Id,
                Name = s.Name,
                EntryCount = entries.Count(e => e.ScheduleId == s.Id)
            })
            .ToList();
    }

    public async Task<ScheduleDetailDto?> GetScheduleDetailAsync(Guid scheduleId)
    {
        var schedule = await dataStore.GetScheduleAsync(scheduleId);
        if (schedule is null)
        {
            return null;
        }

        var classes = await dataStore.GetClassesAsync();
        var students = await dataStore.GetStudentsAsync();
        var entries = await dataStore.GetScheduledClassesAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();

        return new ScheduleDetailDto
        {
            Id = schedule.Id,
            Name = schedule.Name,
            Entries = entries
                .Where(e => e.ScheduleId == scheduleId)
                .Select(e => ToEntryDto(e, classes, students, enrollments))
                .ToList()
        };
    }

    public async Task<ScheduleSummaryDto> CreateScheduleAsync(string name)
    {
        var schedules = await dataStore.GetSchedulesAsync();
        var schedule = new Schedule { Id = Guid.NewGuid(), Name = name };
        schedules.Add(schedule);
        await dataStore.SaveSchedulesAsync(schedules);
        logger.LogInformation("Schedule created {ScheduleId}", schedule.Id);
        return new ScheduleSummaryDto { Id = schedule.Id, Name = schedule.Name, EntryCount = 0 };
    }

    public async Task DeleteScheduleAsync(Guid scheduleId)
    {
        var schedules = await dataStore.GetSchedulesAsync();
        var schedule = schedules.FirstOrDefault(s => s.Id == scheduleId);
        if (schedule is null)
        {
            throw new ClassPlannerNotFoundException("Schedule was not found.");
        }

        schedules.Remove(schedule);
        await dataStore.SaveSchedulesAsync(schedules);

        var entries = await dataStore.GetScheduledClassesAsync();
        entries.RemoveAll(e => e.ScheduleId == scheduleId);
        await dataStore.SaveScheduledClassesAsync(entries);
        logger.LogInformation("Schedule deleted {ScheduleId}", scheduleId);
    }

    public async Task<ScheduledClassDetailDto?> GetScheduledClassDetailAsync(Guid scheduleId, Guid entryId)
    {
        var entries = await dataStore.GetScheduledClassesAsync();
        var entry = entries.FirstOrDefault(e => e.Id == entryId && e.ScheduleId == scheduleId);
        if (entry is null)
        {
            return null;
        }

        var students = await dataStore.GetStudentsAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();

        if (entry.StudentId.HasValue)
        {
            var scheduledStudent = students.FirstOrDefault(s => s.Id == entry.StudentId);
            return new ScheduledClassDetailDto
            {
                Id = entry.Id,
                ScheduleId = entry.ScheduleId,
                StudentId = entry.StudentId,
                StudentName = FormatStudentName(scheduledStudent),
                DayOfWeek = entry.DayOfWeek,
                StartTime = entry.StartTime,
                Duration = entry.Duration,
                Location = entry.Location,
                EnrolledStudents = []
            };
        }

        var trainingClass = await dataStore.GetClassAsync(entry.TrainingClassId!.Value);
        var enrolledStudentIds = enrollments
            .Where(e => e.TrainingClassId == entry.TrainingClassId)
            .Select(e => e.StudentId)
            .ToHashSet();

        return new ScheduledClassDetailDto
        {
            Id = entry.Id,
            ScheduleId = entry.ScheduleId,
            TrainingClassId = entry.TrainingClassId,
            TrainingClassName = trainingClass?.Name ?? "Unknown class",
            ClassDescription = trainingClass?.Description,
            ClassNotes = trainingClass?.Notes,
            DayOfWeek = entry.DayOfWeek,
            StartTime = entry.StartTime,
            Duration = entry.Duration,
            Location = entry.Location,
            EnrolledStudents = students
                .Where(s => enrolledStudentIds.Contains(s.Id))
                .Select(s => ToStudentSummary(s, enrollments))
                .ToList()
        };
    }

    public async Task<ScheduledClassEntryDto> ScheduleClassAsync(Guid scheduleId, Guid trainingClassId, DayOfWeek dayOfWeek, TimeSpan startTime)
    {
        var schedule = await dataStore.GetScheduleAsync(scheduleId);
        if (schedule is null)
        {
            throw new ClassPlannerNotFoundException("Schedule was not found.");
        }

        var trainingClass = await dataStore.GetClassAsync(trainingClassId);
        if (trainingClass is null)
        {
            throw new ClassPlannerNotFoundException("Class was not found.");
        }

        var entries = await dataStore.GetScheduledClassesAsync();
        var entry = new ScheduledClass
        {
            Id = Guid.NewGuid(),
            ScheduleId = scheduleId,
            TrainingClassId = trainingClassId,
            DayOfWeek = dayOfWeek,
            StartTime = startTime,
            Duration = TimeSpan.FromMinutes(60),
            Location = null
        };

        entries.Add(entry);
        await dataStore.SaveScheduledClassesAsync(entries);
        logger.LogInformation("Class scheduled for {ClassId} on schedule {ScheduleId}", trainingClassId, scheduleId);

        var enrollments = await dataStore.GetEnrollmentsAsync();
        return ToEntryDto(entry, [trainingClass], enrollments: enrollments);
    }

    public async Task<ScheduledClassEntryDto> ScheduleStudentAsync(Guid scheduleId, Guid studentId, DayOfWeek dayOfWeek, TimeSpan startTime)
    {
        var schedule = await dataStore.GetScheduleAsync(scheduleId);
        if (schedule is null)
        {
            throw new ClassPlannerNotFoundException("Schedule was not found.");
        }

        var student = await dataStore.GetStudentAsync(studentId);
        if (student is null)
        {
            throw new ClassPlannerNotFoundException("Student was not found.");
        }

        var entries = await dataStore.GetScheduledClassesAsync();
        var entry = new ScheduledClass
        {
            Id = Guid.NewGuid(),
            ScheduleId = scheduleId,
            StudentId = studentId,
            DayOfWeek = dayOfWeek,
            StartTime = startTime,
            Duration = TimeSpan.FromMinutes(30),
            Location = null
        };

        entries.Add(entry);
        await dataStore.SaveScheduledClassesAsync(entries);
        logger.LogInformation("Student scheduled directly for {StudentId} on schedule {ScheduleId}", studentId, scheduleId);

        return ToEntryDto(entry, [], [student]);
    }

    public async Task<ScheduledClassEntryDto> MoveScheduledClassAsync(Guid scheduleId, Guid entryId, DayOfWeek dayOfWeek, TimeSpan startTime, TimeSpan? duration = null, string? location = null)
    {
        var entries = await dataStore.GetScheduledClassesAsync();
        var entry = entries.FirstOrDefault(e => e.Id == entryId && e.ScheduleId == scheduleId);
        if (entry is null)
        {
            throw new ClassPlannerNotFoundException("Scheduled class was not found.");
        }

        entry.DayOfWeek = dayOfWeek;
        entry.StartTime = startTime;
        if (duration.HasValue && duration.Value > TimeSpan.Zero)
        {
            entry.Duration = duration.Value;
        }
        entry.Location = location;
        await dataStore.SaveScheduledClassesAsync(entries);
        logger.LogInformation("Class moved for scheduled entry {EntryId}", entryId);

        var classes = await dataStore.GetClassesAsync();
        var students = await dataStore.GetStudentsAsync();
        var enrollments = await dataStore.GetEnrollmentsAsync();
        return ToEntryDto(entry, classes, students, enrollments);
    }

    public async Task RemoveScheduledClassAsync(Guid scheduleId, Guid entryId)
    {
        var entries = await dataStore.GetScheduledClassesAsync();
        var entry = entries.FirstOrDefault(e => e.Id == entryId && e.ScheduleId == scheduleId);
        if (entry is null)
        {
            throw new ClassPlannerNotFoundException("Scheduled class was not found.");
        }

        entries.Remove(entry);
        await dataStore.SaveScheduledClassesAsync(entries);
        logger.LogInformation("Scheduled class removed {EntryId}", entryId);
    }

    private static ClassSummaryDto ToClassSummary(TrainingClass trainingClass, List<Enrollment> enrollments) => new()
    {
        Id = trainingClass.Id,
        ScheduleId = trainingClass.ScheduleId,
        Name = trainingClass.Name,
        EnrollmentCount = enrollments.Count(e => e.TrainingClassId == trainingClass.Id)
    };

    private static StudentSummaryDto ToStudentSummary(Student student, List<Enrollment> enrollments) => new()
    {
        Id = student.Id,
        FirstName = student.FirstName,
        LastName = student.LastName,
        EnrolledClassCount = enrollments.Count(e => e.StudentId == student.Id)
    };

    private static ScheduledClassEntryDto ToEntryDto(ScheduledClass entry, List<TrainingClass> classes, List<Student>? students = null, List<Enrollment>? enrollments = null) => new()
    {
        Id = entry.Id,
        ScheduleId = entry.ScheduleId,
        TrainingClassId = entry.TrainingClassId,
        TrainingClassName = entry.TrainingClassId.HasValue
            ? classes.FirstOrDefault(c => c.Id == entry.TrainingClassId)?.Name ?? "Unknown class"
            : null,
        EnrollmentCount = entry.TrainingClassId.HasValue
            ? enrollments?.Count(e => e.TrainingClassId == entry.TrainingClassId) ?? 0
            : null,
        StudentId = entry.StudentId,
        StudentName = entry.StudentId.HasValue
            ? FormatStudentName(students?.FirstOrDefault(s => s.Id == entry.StudentId))
            : null,
        DayOfWeek = entry.DayOfWeek,
        StartTime = entry.StartTime,
        Duration = entry.Duration,
        Location = entry.Location
    };

    private static string FormatStudentName(Student? student) =>
        student is null ? "Unknown student" : $"{student.FirstName} {student.LastName}";

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
            var defaultSchedule = new Schedule { Id = Guid.NewGuid(), Name = "Default Schedule" };
            schedules = [defaultSchedule];
            await dataStore.SaveSchedulesAsync(schedules);
            logger.LogInformation("Seeded default schedule");
        }

        var defaultScheduleId = schedules[0].Id;

        if (classes.Count == 0)
        {
            classes =
            [
                new TrainingClass { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, Name = "Agility 101" },
                new TrainingClass { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, Name = "Advanced Agility" },
                new TrainingClass { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, Name = "Puppy Foundations" },
                new TrainingClass { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, Name = "Basic Obedience" },
                new TrainingClass { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, Name = "Jumping Skills" },
                new TrainingClass { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, Name = "Handling Workshop" }
            ];
            await dataStore.SaveClassesAsync(classes);
            logger.LogInformation("Seeded default classes");
        }

        var scheduledClasses = await dataStore.GetScheduledClassesAsync();
        if (scheduledClasses.Count == 0)
        {
            var entries = new List<ScheduledClass>
            {
                new() { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, TrainingClassId = classes[0].Id, DayOfWeek = DayOfWeek.Monday, StartTime = TimeSpan.FromHours(9), Duration = TimeSpan.FromMinutes(60) },
                new() { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, TrainingClassId = classes[2].Id, DayOfWeek = DayOfWeek.Tuesday, StartTime = TimeSpan.FromHours(10), Duration = TimeSpan.FromMinutes(45) },
                new() { Id = Guid.NewGuid(), ScheduleId = defaultScheduleId, TrainingClassId = classes[4].Id, DayOfWeek = DayOfWeek.Wednesday, StartTime = TimeSpan.FromHours(13), Duration = TimeSpan.FromMinutes(60) }
            };
            await dataStore.SaveScheduledClassesAsync(entries);
            logger.LogInformation("Seeded default scheduled classes");
        }
    }
}
