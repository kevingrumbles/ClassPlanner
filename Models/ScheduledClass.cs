namespace ClassPlanner.Models;

/// <summary>
/// A class placed onto a <see cref="Schedule"/> at a given day of the week and time of day.
/// There is no specific calendar date — the same schedule is intended to repeat weekly.
/// </summary>
public class ScheduledClass
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public Guid TrainingClassId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }

    /// <summary>Time of day the class starts (date component is ignored).</summary>
    public TimeSpan StartTime { get; set; }
    public TimeSpan Duration { get; set; }
    public string? Location { get; set; }
}
