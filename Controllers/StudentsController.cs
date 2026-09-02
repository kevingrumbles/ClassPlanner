using ClassPlanner.Services;
using ClassPlanner.Services.Dtos;
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

    [HttpPost]
    public async Task<IActionResult> CreateStudent([FromBody] CreateStudentRequest request)
    {
        var created = await service.CreateStudentAsync(request.FirstName, request.LastName);
        return CreatedAtAction(nameof(GetStudent), new { id = created.Id }, created);
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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteStudent(Guid id)
    {
        try
        {
            await service.DeleteStudentAsync(id);
            return NoContent();
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateStudent(Guid id, [FromBody] UpdateStudentRequest request)
    {
        try
        {
            var updated = await service.UpdateStudentAsync(id, request.Email, request.Phone, request.Notes);
            return Ok(updated);
        }
        catch (ClassPlannerNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
