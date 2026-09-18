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

    /// <summary>
    /// True when local details changed after the event was last uploaded, so the Google event
    /// is out of date. The mapping is deliberately retained rather than deleted: <see cref="EventId"/>
    /// is required for the next sync to update the existing event in place instead of inserting
    /// a second one and leaving the original orphaned as a duplicate.
    /// </summary>
    public bool NeedsSync { get; set; }
}
