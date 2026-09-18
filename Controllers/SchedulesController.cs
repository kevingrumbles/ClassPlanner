using ClassPlanner.Services;
using ClassPlanner.Services.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace ClassPlanner.Controllers;

[ApiController]
[Route("api/schedules")]
public class SchedulesController(ClassPlannerService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSchedules()
    {
        var schedules = await service.GetSchedulesAsync();
        return Ok(schedules);
    }

    [HttpGet("{scheduleId:guid}")]
    public async Task<IActionResult> GetSchedule(Guid scheduleId)
    {
        // The token is optional: when supplied, entries whose Google events have been deleted
        // in Google Calendar are reverted to the "not uploaded" state.
        var schedule = await service.GetScheduleDetailAsync(scheduleId, GetBearerToken());
        if (schedule is null)
        {
            return NotFound(new { message = "Schedule was not found." });
        }

        return Ok(schedule);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSchedule([FromBody] CreateScheduleRequest request)
    {
        var schedule = await service.CreateScheduleAsync(request.Name);
        return CreatedAtAction(nameof(GetSchedule), new { scheduleId = schedule.Id }, schedule);
    }

    [HttpDelete("{scheduleId:guid}")]
    public async Task<IActionResult> DeleteSchedule(Guid scheduleId)
    {
        try
        {
            await service.DeleteScheduleAsync(scheduleId);
            return NoContent();
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{scheduleId:guid}")]
    public async Task<IActionResult> UpdateSchedule(Guid scheduleId, [FromBody] UpdateScheduleRequest request)
    {
        try
        {
            var updated = await service.UpdateScheduleAsync(scheduleId, request.StartDate, request.EndDate);
            return Ok(updated);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{scheduleId:guid}/name")]
    public async Task<IActionResult> RenameSchedule(Guid scheduleId, [FromBody] RenameScheduleRequest request)
    {
        try
        {
            var updated = await service.RenameScheduleAsync(scheduleId, request.Name);
            return Ok(updated);
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

    [HttpPost("{scheduleId:guid}/copy")]
    public async Task<IActionResult> CopySchedule(Guid scheduleId, [FromBody] CopyScheduleRequest request)
    {
        try
        {
            var copy = await service.CopyScheduleAsync(scheduleId, request.Name);
            return CreatedAtAction(nameof(GetSchedule), new { scheduleId = copy.Id }, copy);
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

    [HttpGet("{scheduleId:guid}/entries/{entryId:guid}")]
    public async Task<IActionResult> GetScheduledClass(Guid scheduleId, Guid entryId)
    {
        var entry = await service.GetScheduledClassDetailAsync(scheduleId, entryId);
        if (entry is null)
        {
            return NotFound(new { message = "Scheduled class was not found." });
        }

        return Ok(entry);
    }

    [HttpPost("{scheduleId:guid}/entries")]
    public async Task<IActionResult> ScheduleClass(Guid scheduleId, [FromBody] CreateScheduledClassRequest request)
    {
        try
        {
            var entry = await service.ScheduleClassAsync(scheduleId, request.TrainingClassId, request.DayOfWeek, request.StartTime);
            return CreatedAtAction(nameof(GetScheduledClass), new { scheduleId, entryId = entry.Id }, entry);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{scheduleId:guid}/entries/student")]
    public async Task<IActionResult> ScheduleStudent(Guid scheduleId, [FromBody] CreateScheduledStudentRequest request)
    {
        try
        {
            var entry = await service.ScheduleStudentAsync(scheduleId, request.StudentId, request.DayOfWeek, request.StartTime);
            return CreatedAtAction(nameof(GetScheduledClass), new { scheduleId, entryId = entry.Id }, entry);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{scheduleId:guid}/entries/{entryId:guid}")]
    public async Task<IActionResult> MoveScheduledClass(Guid scheduleId, Guid entryId, [FromBody] MoveScheduledClassRequest request)
    {
        try
        {
            var entry = await service.MoveScheduledClassAsync(scheduleId, entryId, request.DayOfWeek, request.StartTime, request.Duration, request.Location);
            return Ok(entry);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{scheduleId:guid}/entries/{entryId:guid}")]
    public async Task<IActionResult> RemoveScheduledClass(Guid scheduleId, Guid entryId)
    {
        try
        {
            await service.RemoveScheduledClassAsync(scheduleId, entryId);
            return NoContent();
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Synchronizes this schedule's entries to the user's "Class Planner" Google Calendar
    /// as weekly recurring events. ClassPlanner remains the source of truth; this is a
    /// one-way, idempotent push (repeated calls update existing events rather than duplicating them).
    /// </summary>
    [HttpPost("{scheduleId:guid}/google-calendar")]
    public async Task<IActionResult> UpdateGoogleCalendar(Guid scheduleId)
    {
        try
        {
            var accessToken = GetBearerToken();
            var result = await service.SyncScheduleToGoogleCalendarAsync(scheduleId, accessToken);
            return Ok(result);
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
