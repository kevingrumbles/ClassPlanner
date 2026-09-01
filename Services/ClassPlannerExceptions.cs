namespace ClassPlanner.Services;

/// <summary>
/// Thrown when a requested operation conflicts with a business rule
/// (for example, enrolling into a full class or a duplicate enrollment).
/// Controllers translate this into an HTTP 409 Conflict response.
/// </summary>
public class ClassPlannerConflictException(string message) : Exception(message)
{
}

/// <summary>
/// Thrown when a referenced entity (student, class, schedule) does not exist.
/// Controllers translate this into an HTTP 404 Not Found response.
/// </summary>
public class ClassPlannerNotFoundException(string message) : Exception(message)
{
}
