using ClassPlanner.Models;

namespace ClassPlanner.Persistence;

/// <summary>
/// Abstraction over persistence for all Class Planner entities.
/// The current implementation (<see cref="JsonDataStore"/>) stores data in JSON files,
/// but this interface allows the storage mechanism to be swapped later
/// (for example, for a SQL-backed implementation) without changing callers.
/// </summary>
public interface IDataStore
{
    Task<List<Student>> GetStudentsAsync();
    Task<Student?> GetStudentAsync(Guid id);
    Task SaveStudentsAsync(List<Student> students);

    Task<List<TrainingClass>> GetClassesAsync();
    Task<TrainingClass?> GetClassAsync(Guid id);
    Task SaveClassesAsync(List<TrainingClass> classes);

    Task<List<Enrollment>> GetEnrollmentsAsync();
    Task SaveEnrollmentsAsync(List<Enrollment> enrollments);

    Task<List<Schedule>> GetSchedulesAsync();
    Task<Schedule?> GetScheduleAsync(Guid id);
    Task SaveSchedulesAsync(List<Schedule> schedules);

    Task<List<ScheduledClass>> GetScheduledClassesAsync();
    Task SaveScheduledClassesAsync(List<ScheduledClass> scheduledClasses);

    Task<GoogleCalendarSettings> GetGoogleCalendarSettingsAsync();
    Task SaveGoogleCalendarSettingsAsync(GoogleCalendarSettings settings);

    Task<List<GoogleCalendarEventMapping>> GetGoogleCalendarEventMappingsAsync();
    Task SaveGoogleCalendarEventMappingsAsync(List<GoogleCalendarEventMapping> mappings);
}
