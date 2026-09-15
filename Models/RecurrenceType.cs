namespace ClassPlanner.Models;

/// <summary>
/// Describes how a <see cref="ScheduledClass"/> occurrence recurs. Also determines Google
/// Calendar synchronization ownership: <see cref="Once"/> events are two-way editable between
/// ClassPlanner and Google, while all other (recurring) types are ClassPlanner-authoritative.
/// </summary>
public enum RecurrenceType
{
    /// <summary>Repeats every week on the same day of week and time. ClassPlanner is authoritative; Google-side edits are overwritten on sync.</summary>
    Weekly,

    /// <summary>A single, non-repeating occurrence on a specific calendar date. Two-way editable between ClassPlanner and Google Calendar.</summary>
    Once
}
