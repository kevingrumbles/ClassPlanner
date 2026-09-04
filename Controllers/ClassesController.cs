using ClassPlanner.Services;
using ClassPlanner.Services.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace ClassPlanner.Controllers;

[ApiController]
[Route("api/classes")]
public class ClassesController(ClassPlannerService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetClasses([FromQuery] Guid? scheduleId = null)
    {
        var classes = await service.GetClassesAsync(scheduleId);
        return Ok(classes);
    }

    [HttpPost]
    public async Task<IActionResult> CreateClass([FromQuery] Guid scheduleId, [FromBody] CreateClassRequest request)
    {
        try
        {
            var created = await service.CreateClassAsync(scheduleId, request.Name);
            return CreatedAtAction(nameof(GetClass), new { id = created.Id }, created);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetClass(Guid id)
    {
        var trainingClass = await service.GetClassDetailAsync(id);
        if (trainingClass is null)
        {
            return NotFound(new { message = "Class was not found." });
        }

        return Ok(trainingClass);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateClass(Guid id, [FromBody] UpdateClassRequest request)
    {
        try
        {
            var updated = await service.UpdateClassAsync(id, request.Name, request.Description, request.Notes);
            return Ok(updated);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteClass(Guid id)
    {
        try
        {
            await service.DeleteClassAsync(id);
            return NoContent();
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/students")]
    public async Task<IActionResult> GetClassStudents(Guid id)
    {
        var students = await service.GetClassStudentsAsync(id);
        if (students is null)
        {
            return NotFound(new { message = "Class was not found." });
        }

        return Ok(students);
    }

    [HttpPost("{classId:guid}/students/{studentId:guid}")]
    public async Task<IActionResult> EnrollStudent(Guid classId, Guid studentId)
    {
        try
        {
            await service.EnrollStudentAsync(classId, studentId);
            return NoContent();
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

    [HttpDelete("{classId:guid}/students/{studentId:guid}")]
    public async Task<IActionResult> RemoveStudentFromClass(Guid classId, Guid studentId)
    {
        try
        {
            await service.RemoveStudentFromClassAsync(classId, studentId);
            return NoContent();
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
