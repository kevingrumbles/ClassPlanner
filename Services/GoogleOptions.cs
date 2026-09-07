namespace ClassPlanner.Services;

/// <summary>
/// Configuration options for Google Calendar integration.
/// Authentication uses Google Identity Services' browser popup token flow, so only a
/// public OAuth client id is required here - no client secret is used or stored.
/// </summary>
public class GoogleOptions
{
    public const string SectionName = "Google";

    public string ClientId { get; set; } = "";

    /// <summary>OAuth scope requested by the browser popup flow.</summary>
    public string Scope { get; set; } = "https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/userinfo.email";

    /// <summary>Name of the dedicated secondary Google Calendar used for ClassPlanner events.</summary>
    public string CalendarName { get; set; } = "Class Planner";

    /// <summary>IANA time zone used when constructing recurring events (e.g. "America/Los_Angeles").</summary>
    public string TimeZone { get; set; } = "America/Los_Angeles";
}
