using System.Net;
using System.Net.Http.Json;
using Google;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Microsoft.Extensions.Options;

namespace ClassPlanner.Services;

/// <summary>
/// Isolates all Google Calendar API integration details (token validation, calendar
/// lookup/creation, and event create/update/delete) from the rest of ClassPlanner.
/// Authentication uses Google Identity Services' browser popup token flow: the frontend
/// obtains a short-lived OAuth access token directly from Google and sends it with each
/// request; this class never stores it and knows nothing about ClassPlanner's domain model.
/// </summary>
public class GoogleCalendarService(HttpClient httpClient, IOptions<GoogleOptions> options, ILogger<GoogleCalendarService> logger)
{
    private static readonly Dictionary<DayOfWeek, string> ByDayCodes = new()
    {
        [DayOfWeek.Monday] = "MO",
        [DayOfWeek.Tuesday] = "TU",
        [DayOfWeek.Wednesday] = "WE",
        [DayOfWeek.Thursday] = "TH",
        [DayOfWeek.Friday] = "FR",
        [DayOfWeek.Saturday] = "SA",
        [DayOfWeek.Sunday] = "SU",
    };

    private readonly GoogleOptions _options = options.Value;

    /// <summary>
    /// Validates the access token against Google's tokeninfo endpoint and confirms it was
    /// issued for this application's OAuth client. Returns the granted email if available
    /// (narrow scopes such as calendar.app.created typically do not include it).
    /// </summary>
    public async Task<GoogleTokenValidationResult> ValidateAccessTokenAsync(string accessToken)
    {
        try
        {
            var response = await httpClient.GetAsync(
                $"https://oauth2.googleapis.com/tokeninfo?access_token={Uri.EscapeDataString(accessToken)}");

            if (!response.IsSuccessStatusCode)
            {
                return new GoogleTokenValidationResult(false, null);
            }

            var info = await response.Content.ReadFromJsonAsync<GoogleTokenInfo>();
            if (info is null || string.IsNullOrEmpty(_options.ClientId) || info.Aud != _options.ClientId)
            {
                return new GoogleTokenValidationResult(false, null);
            }

            return new GoogleTokenValidationResult(true, info.Email);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to validate Google access token.");
            return new GoogleTokenValidationResult(false, null);
        }
    }

    private static CalendarService CreateCalendarService(string accessToken)
    {
        var credential = GoogleCredential.FromAccessToken(accessToken);
        return new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "ClassPlanner",
        });
    }

    /// <summary>
    /// Returns the id of the dedicated secondary "Class Planner" calendar, using
    /// <paramref name="existingCalendarId"/> if it is still valid, otherwise creating a new
    /// secondary calendar. Note: the narrow calendar.app.created scope only grants access to
    /// calendars/events this app has created, so we cannot list/search the user's full
    /// calendar list (CalendarList.List requires a broader scope) - the persisted calendar id
    /// is the only way to find a previously-created calendar.
    /// </summary>
    public async Task<string> FindOrCreateCalendarAsync(string accessToken, string? existingCalendarId)
    {
        var calendarService = CreateCalendarService(accessToken);

        if (!string.IsNullOrEmpty(existingCalendarId))
        {
            try
            {
                await calendarService.Calendars.Get(existingCalendarId).ExecuteAsync();
                return existingCalendarId;
            }
            catch (GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.NotFound)
            {
                logger.LogWarning("Configured Google calendar {CalendarId} no longer exists; creating a new one.", existingCalendarId);
            }
        }

        var created = await calendarService.Calendars.Insert(new Calendar
        {
            Summary = _options.CalendarName,
            TimeZone = _options.TimeZone,
        }).ExecuteAsync();

        return created.Id;
    }

    /// <summary>
    /// Creates or updates a weekly recurring event representing a single ClassPlanner
    /// scheduled entry. Returns the Google event id (unchanged when updating).
    /// </summary>
    public async Task<string> UpsertEventAsync(string accessToken, string calendarId, string? existingEventId, GoogleCalendarEventInput input)
    {
        var calendarService = CreateCalendarService(accessToken);
        var googleEvent = BuildEvent(input);

        if (!string.IsNullOrEmpty(existingEventId))
        {
            try
            {
                var updated = await calendarService.Events.Update(googleEvent, calendarId, existingEventId).ExecuteAsync();
                return updated.Id;
            }
            catch (GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.NotFound || ex.HttpStatusCode == HttpStatusCode.Gone)
            {
                logger.LogWarning("Google event {EventId} on calendar {CalendarId} no longer exists; recreating it.", existingEventId, calendarId);
            }
        }

        var inserted = await calendarService.Events.Insert(googleEvent, calendarId).ExecuteAsync();
        return inserted.Id;
    }

    /// <summary>Deletes an event, tolerating the case where it was already removed manually.</summary>
    public async Task DeleteEventAsync(string accessToken, string calendarId, string eventId)
    {
        var calendarService = CreateCalendarService(accessToken);
        try
        {
            await calendarService.Events.Delete(calendarId, eventId).ExecuteAsync();
        }
        catch (GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.NotFound || ex.HttpStatusCode == HttpStatusCode.Gone)
        {
            // Already gone (e.g. removed manually or the calendar itself was recreated). Nothing to do.
        }
    }

    /// <summary>True when the exception indicates the calendar itself no longer exists.</summary>
    public static bool IsCalendarNotFound(Exception ex) =>
        ex is GoogleApiException { HttpStatusCode: HttpStatusCode.NotFound };

    private Event BuildEvent(GoogleCalendarEventInput input)
    {
        var start = input.FirstOccurrenceDate.ToDateTime(TimeOnly.FromTimeSpan(input.StartTime));
        var end = start + input.Duration;

        var recurrence = $"RRULE:FREQ=WEEKLY;BYDAY={ByDayCodes[input.DayOfWeek]}";
        if (input.RecurrenceEndDate is { } untilDate)
        {
            // UNTIL is inclusive of the whole day; use the end of the day so the final
            // occurrence on the end date itself is not truncated.
            var untilDateTime = untilDate.ToDateTime(new TimeOnly(23, 59, 59));
            recurrence += $";UNTIL={untilDateTime:yyyyMMdd'T'HHmmss'Z'}";
        }

        return new Event
        {
            Summary = input.Summary,
            Description = input.Description,
            Location = string.IsNullOrWhiteSpace(input.Location) ? null : input.Location,
            Start = new EventDateTime
            {
                DateTimeDateTimeOffset = null,
                DateTimeRaw = start.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = _options.TimeZone,
            },
            End = new EventDateTime
            {
                DateTimeDateTimeOffset = null,
                DateTimeRaw = end.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = _options.TimeZone,
            },
            Recurrence = [recurrence],
        };
    }
}

/// <summary>Plain input describing the recurring event to create/update. Not a domain model.</summary>
public record GoogleCalendarEventInput(
    string Summary,
    string? Description,
    string? Location,
    DateOnly FirstOccurrenceDate,
    TimeSpan StartTime,
    TimeSpan Duration,
    DayOfWeek DayOfWeek,
    DateOnly? RecurrenceEndDate);

/// <summary>Result of validating a Google OAuth access token against Google's tokeninfo endpoint.</summary>
public record GoogleTokenValidationResult(bool IsValid, string? Email);

/// <summary>Subset of Google's tokeninfo response used to validate the token's audience/owner.</summary>
public class GoogleTokenInfo
{
    public string? Aud { get; set; }
    public string? Email { get; set; }
    public string? Scope { get; set; }
    public string? Exp { get; set; }
}
