using ClassPlanner.Services;
using Microsoft.AspNetCore.Mvc;

namespace ClassPlanner.Controllers;

[ApiController]
[Route("api/students")]
public class StudentsController(ClassPlannerService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetStudents()
    {
        var students = await service.GetStudentsAsync();
        return Ok(students);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetStudent(Guid id)
    {
        var student = await service.GetStudentDetailAsync(id);
        if (student is null)
        {
            return NotFound(new { message = "Student was not found." });
        }

        return Ok(student);
    }
}
