using ClassPlanner.Services;
using ClassPlanner.Services.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ClassPlanner.Controllers;

[ApiController]
[Route("api/google")]
public class GoogleController(ClassPlannerService service, IOptions<GoogleOptions> googleOptions) : ControllerBase
{
    /// <summary>
    /// Returns the public OAuth configuration (client id + scope) needed by the frontend
    /// to initialize the Google Identity Services popup token client. Contains no secrets.
    /// </summary>
    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        var options = googleOptions.Value;
        return Ok(new GoogleCalendarConfigDto { ClientId = options.ClientId, Scope = options.Scope });
    }

    /// <summary>
    /// Returns whether the access token supplied in the Authorization header is a valid,
    /// currently-connected Google account. The token itself is never persisted server-side.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var accessToken = GetBearerToken();
        var status = await service.GetGoogleCalendarStatusAsync(accessToken);
        return Ok(status);
    }

    /// <summary>
    /// Returns a plain, read-only list of upcoming events (today forward) from the user's
    /// dedicated "Class Planner" Google Calendar. No reconciliation with ClassPlanner data.
    /// </summary>
    [HttpGet("events")]
    public async Task<IActionResult> GetEvents()
    {
        var accessToken = GetBearerToken();
        var events = await service.GetUpcomingGoogleCalendarEventsAsync(accessToken);
        return Ok(events);
    }

    /// <summary>
    /// Creates a one-time appointment directly on the user's dedicated "Class Planner" Google
    /// Calendar for the given student, bypassing ClassPlanner schedules entirely. Used by the
    /// Calendar View's drag-and-drop onto a dated slot.
    /// </summary>
    [HttpPost("events")]
    public async Task<IActionResult> CreateEvent([FromBody] CreateGoogleAppointmentRequest request)
    {
        var accessToken = GetBearerToken();
        try
        {
            var created = await service.CreateAdHocGoogleAppointmentAsync(
                request.StudentId, request.EventDate, request.StartTime, request.Duration, accessToken);
            return Ok(created);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ClassPlannerConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    private string? GetBearerToken()
    {
        var header = Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return header["Bearer ".Length..].Trim();
    }
}
