using System.Text.Json;
using ClassPlanner.Models;
using ClassPlanner.Services;
using Microsoft.Extensions.Options;

namespace ClassPlanner.Persistence;

/// <summary>
/// JSON file-based implementation of <see cref="IDataStore"/>.
/// Each entity collection is stored in its own JSON file under the configured data directory.
/// Writes are protected with an in-process lock per file and are written atomically
/// (write to a temp file, then replace) to avoid corrupting data on concurrent access.
/// </summary>
public class JsonDataStore : IDataStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true,
        // Persist RecurrenceType by name so stored data stays readable and is not invalidated
        // by reordering enum members. Reading also accepts the legacy numeric form. Other
        // enums (e.g. DayOfWeek) keep their numeric representation.
        Converters = { new RecurrenceTypeJsonConverter() }
    };

    private readonly string _dataDirectory;
    private readonly ILogger<JsonDataStore> _logger;

    private readonly SemaphoreSlim _studentsLock = new(1, 1);
    private readonly SemaphoreSlim _classesLock = new(1, 1);
    private readonly SemaphoreSlim _enrollmentsLock = new(1, 1);
    private readonly SemaphoreSlim _schedulesLock = new(1, 1);
    private readonly SemaphoreSlim _scheduledClassesLock = new(1, 1);
    private readonly SemaphoreSlim _googleCalendarSettingsLock = new(1, 1);
    private readonly SemaphoreSlim _googleCalendarEventMappingsLock = new(1, 1);

    private const string StudentsFile = "students.json";
    private const string ClassesFile = "classes.json";
    private const string EnrollmentsFile = "enrollments.json";
    private const string SchedulesFile = "schedules.json";
    private const string ScheduledClassesFile = "scheduledClasses.json";
    private const string GoogleCalendarSettingsFile = "googleCalendar.json";
    private const string GoogleCalendarEventMappingsFile = "googleCalendarEvents.json";

    public JsonDataStore(IOptions<DataStoreOptions> options, IWebHostEnvironment environment, ILogger<JsonDataStore> logger)
    {
        _logger = logger;
        var configuredDirectory = options.Value.DataDirectory;
        _dataDirectory = Path.IsPathRooted(configuredDirectory)
            ? configuredDirectory
            : Path.Combine(environment.ContentRootPath, configuredDirectory);

        Directory.CreateDirectory(_dataDirectory);
    }

    public Task<List<Student>> GetStudentsAsync() => ReadAsync<Student>(StudentsFile, _studentsLock);
    public Task SaveStudentsAsync(List<Student> students) => WriteAsync(StudentsFile, students, _studentsLock);

    public async Task<Student?> GetStudentAsync(Guid id)
    {
        var students = await GetStudentsAsync();
        return students.FirstOrDefault(s => s.Id == id);
    }

    public Task<List<TrainingClass>> GetClassesAsync() => ReadAsync<TrainingClass>(ClassesFile, _classesLock);
    public Task SaveClassesAsync(List<TrainingClass> classes) => WriteAsync(ClassesFile, classes, _classesLock);

    public async Task<TrainingClass?> GetClassAsync(Guid id)
    {
        var classes = await GetClassesAsync();
        return classes.FirstOrDefault(c => c.Id == id);
    }

    public Task<List<Enrollment>> GetEnrollmentsAsync() => ReadAsync<Enrollment>(EnrollmentsFile, _enrollmentsLock);
    public Task SaveEnrollmentsAsync(List<Enrollment> enrollments) => WriteAsync(EnrollmentsFile, enrollments, _enrollmentsLock);

    public Task<List<Schedule>> GetSchedulesAsync() => ReadAsync<Schedule>(SchedulesFile, _schedulesLock);
    public Task SaveSchedulesAsync(List<Schedule> schedules) => WriteAsync(SchedulesFile, schedules, _schedulesLock);

    public async Task<Schedule?> GetScheduleAsync(Guid id)
    {
        var schedules = await GetSchedulesAsync();
        return schedules.FirstOrDefault(s => s.Id == id);
    }

    public Task<List<ScheduledClass>> GetScheduledClassesAsync() => ReadAsync<ScheduledClass>(ScheduledClassesFile, _scheduledClassesLock);
    public Task SaveScheduledClassesAsync(List<ScheduledClass> scheduledClasses) => WriteAsync(ScheduledClassesFile, scheduledClasses, _scheduledClassesLock);

    // Google Calendar settings are a single settings object rather than a domain collection,
    // so they are read/written directly instead of reusing the list-based ReadAsync/WriteAsync helpers.
    public async Task<GoogleCalendarSettings> GetGoogleCalendarSettingsAsync()
    {
        var path = Path.Combine(_dataDirectory, GoogleCalendarSettingsFile);

        await _googleCalendarSettingsLock.WaitAsync();
        try
        {
            if (!File.Exists(path))
            {
                return new GoogleCalendarSettings();
            }

            await using var stream = File.OpenRead(path);
            var settings = await JsonSerializer.DeserializeAsync<GoogleCalendarSettings>(stream, SerializerOptions);
            return settings ?? new GoogleCalendarSettings();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read data file {FileName}", GoogleCalendarSettingsFile);
            return new GoogleCalendarSettings();
        }
        finally
        {
            _googleCalendarSettingsLock.Release();
        }
    }

    public async Task SaveGoogleCalendarSettingsAsync(GoogleCalendarSettings settings)
    {
        var path = Path.Combine(_dataDirectory, GoogleCalendarSettingsFile);
        var tempPath = path + ".tmp";

        await _googleCalendarSettingsLock.WaitAsync();
        try
        {
            await using (var stream = File.Create(tempPath))
            {
                await JsonSerializer.SerializeAsync(stream, settings, SerializerOptions);
            }

            File.Move(tempPath, path, overwrite: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write data file {FileName}", GoogleCalendarSettingsFile);
            throw;
        }
        finally
        {
            _googleCalendarSettingsLock.Release();
        }
    }

    public Task<List<GoogleCalendarEventMapping>> GetGoogleCalendarEventMappingsAsync() =>
        ReadAsync<GoogleCalendarEventMapping>(GoogleCalendarEventMappingsFile, _googleCalendarEventMappingsLock);

    public Task SaveGoogleCalendarEventMappingsAsync(List<GoogleCalendarEventMapping> mappings) =>
        WriteAsync(GoogleCalendarEventMappingsFile, mappings, _googleCalendarEventMappingsLock);

    private async Task<List<T>> ReadAsync<T>(string fileName, SemaphoreSlim fileLock)
    {
        var path = Path.Combine(_dataDirectory, fileName);

        await fileLock.WaitAsync();
        try
        {
            if (!File.Exists(path))
            {
                return [];
            }

            await using var stream = File.OpenRead(path);
            var items = await JsonSerializer.DeserializeAsync<List<T>>(stream, SerializerOptions);
            return items ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read data file {FileName}", fileName);
            return [];
        }
        finally
        {
            fileLock.Release();
        }
    }

    private async Task WriteAsync<T>(string fileName, List<T> items, SemaphoreSlim fileLock)
    {
        var path = Path.Combine(_dataDirectory, fileName);
        var tempPath = path + ".tmp";

        await fileLock.WaitAsync();
        try
        {
            await using (var stream = File.Create(tempPath))
            {
                await JsonSerializer.SerializeAsync(stream, items, SerializerOptions);
            }

            File.Move(tempPath, path, overwrite: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write data file {FileName}", fileName);
            throw;
        }
        finally
        {
            fileLock.Release();
        }
    }
}
