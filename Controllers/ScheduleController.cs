using ClassPlanner.Services;
using ClassPlanner.Services.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace ClassPlanner.Controllers;

[ApiController]
[Route("api/schedule")]
public class ScheduleController(ClassPlannerService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSchedule()
    {
        var schedule = await service.GetScheduleAsync();
        return Ok(schedule);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetScheduleDetail(Guid id)
    {
        var detail = await service.GetScheduleDetailAsync(id);
        if (detail is null)
        {
            return NotFound(new { message = "Scheduled class was not found." });
        }

        return Ok(detail);
    }

    [HttpPost]
    public async Task<IActionResult> ScheduleClass([FromBody] ScheduleClassRequest request)
    {
        try
        {
            var schedule = await service.ScheduleClassAsync(request.TrainingClassId, request.StartTime);
            return CreatedAtAction(nameof(GetScheduleDetail), new { id = schedule.Id }, schedule);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> MoveScheduledClass(Guid id, [FromBody] MoveScheduleRequest request)
    {
        try
        {
            var schedule = await service.MoveScheduledClassAsync(id, request.StartTime);
            return Ok(schedule);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> RemoveScheduledClass(Guid id)
    {
        try
        {
            await service.RemoveScheduledClassAsync(id);
            return NoContent();
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
