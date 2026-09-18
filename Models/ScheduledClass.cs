namespace ClassPlanner.Models;

/// <summary>
/// A class occurrence or a direct student appointment placed onto a <see cref="Schedule"/> at a
/// given day of the week and time of day. There is no specific calendar date — the same schedule
/// is intended to repeat weekly. Exactly one of <see cref="TrainingClassId"/> or <see cref="StudentId"/>
/// is set: a class occurrence references a <see cref="TrainingClass"/>, while a direct appointment
/// references a <see cref="Student"/> with no associated class.
/// </summary>
public class ScheduledClass
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public Guid? TrainingClassId { get; set; }
    public Guid? StudentId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }

    /// <summary>Time of day the class starts (date component is ignored).</summary>
    public TimeSpan StartTime { get; set; }
    public TimeSpan Duration { get; set; }
    public string? Location { get; set; }

    /// <summary>How this occurrence repeats. Currently always weekly; more types may be added in the future.</summary>
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.Weekly;

    /// <summary>
    /// The specific calendar date this occurrence falls on. Only meaningful when
    /// <see cref="RecurrenceType"/> is <see cref="Models.RecurrenceType.Once"/>; ignored for
    /// recurring entries, which repeat indefinitely on <see cref="DayOfWeek"/>.
    /// </summary>
    public DateOnly? EventDate { get; set; }

    /// <summary>Optional display title, used for direct appointments imported from external sources.</summary>
    public string? Title { get; set; }

    /// <summary>
    /// True when this entry has been removed locally but still has a Google Calendar event that
    /// must be deleted. The entry is kept as a tombstone so the schedule can show it as pending
    /// removal, and so the sync knows which Google event to delete. It is discarded once the
    /// removal has been synchronized.
    /// </summary>
    public bool PendingDeletion { get; set; }
}
