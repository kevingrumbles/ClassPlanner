namespace ClassPlanner.Persistence;

/// <summary>
/// Configuration options for JSON-backed data storage.
/// </summary>
public class DataStoreOptions
{
    public const string SectionName = "DataStore";

    /// <summary>
    /// Directory (relative to content root, or absolute) where JSON data files are stored.
    /// </summary>
    public string DataDirectory { get; set; } = "data";
}
