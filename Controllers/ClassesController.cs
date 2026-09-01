using ClassPlanner.Services;
using Microsoft.AspNetCore.Mvc;

namespace ClassPlanner.Controllers;

[ApiController]
[Route("api/classes")]
public class ClassesController(ClassPlannerService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetClasses()
    {
        var classes = await service.GetClassesAsync();
        return Ok(classes);
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
            return Ok();
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
