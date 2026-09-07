namespace ClassPlanner.Models;

/// <summary>
/// Describes how a <see cref="ScheduledClass"/> occurrence recurs. Currently only weekly
/// repetition is supported, but this is expected to grow (e.g. one-time, bi-weekly, monthly).
/// </summary>
public enum RecurrenceType
{
    /// <summary>Repeats every week on the same day of week and time.</summary>
    Weekly
}
