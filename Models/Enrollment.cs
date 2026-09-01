namespace ClassPlanner.Models;

public class Enrollment
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid TrainingClassId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
