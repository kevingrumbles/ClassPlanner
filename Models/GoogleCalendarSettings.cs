namespace ClassPlanner.Models;

/// <summary>
/// Settings for the dedicated "Class Planner" secondary Google Calendar.
/// Persisted as a single settings object (not a collection) in data/googleCalendar.json,
/// so future synchronizations do not need to search for the calendar every time.
/// </summary>
public class GoogleCalendarSettings
{
    public string CalendarId { get; set; } = "";
}
