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
        var schedule = await service.GetScheduleDetailAsync(scheduleId);
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

    [HttpPut("{scheduleId:guid}/entries/{entryId:guid}")]
    public async Task<IActionResult> MoveScheduledClass(Guid scheduleId, Guid entryId, [FromBody] MoveScheduledClassRequest request)
    {
        try
        {
            var entry = await service.MoveScheduledClassAsync(scheduleId, entryId, request.DayOfWeek, request.StartTime);
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
}
