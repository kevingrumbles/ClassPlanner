namespace ClassPlanner.Models;

public class ClassSchedule
{
    public Guid Id { get; set; }
    public Guid TrainingClassId { get; set; }
    public DateTime StartTime { get; set; }
    public TimeSpan Duration { get; set; }
    public string? Location { get; set; }
}
