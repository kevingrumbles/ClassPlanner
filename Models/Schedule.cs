namespace ClassPlanner.Models;

/// <summary>
/// A named weekly schedule "template". It does not represent a specific dated calendar —
/// it holds a collection of <see cref="ScheduledClass"/> entries assigned to a day of the week
/// and time of day, independent of any actual date.
/// </summary>
public class Schedule
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}
