namespace ClassPlanner.Models;

/// <summary>
/// Local mapping from a ClassPlanner <see cref="ScheduledClass"/> to the Google Calendar
/// event that represents it. This mapping is the authoritative association used
/// to avoid creating duplicate events on repeated synchronization; it is intentionally kept
/// separate from the core domain model (see Models/ScheduledClass.cs).
/// </summary>
public class GoogleCalendarEventMapping
{
    public Guid ScheduledClassId { get; set; }
    public Guid ScheduleId { get; set; }
    public string CalendarId { get; set; } = "";
    public string EventId { get; set; } = "";
}
