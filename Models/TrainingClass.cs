namespace ClassPlanner.Models;

public class TrainingClass
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public Guid? InstructorId { get; set; }
    public int MaximumStudents { get; set; }
    public TimeSpan Duration { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }
}
