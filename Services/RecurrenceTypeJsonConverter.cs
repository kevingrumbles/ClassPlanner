using System.Text.Json;
using System.Text.Json.Serialization;
using ClassPlanner.Models;

namespace ClassPlanner.Services;

/// <summary>
/// Serializes <see cref="RecurrenceType"/> by name ("Once"/"Weekly") so it matches the
/// frontend's string union, while leaving other enums (notably <see cref="DayOfWeek"/>, which
/// the frontend uses as a 0-6 array index) on their default numeric representation.
/// Reading accepts both the name and the legacy numeric form.
/// </summary>
public class RecurrenceTypeJsonConverter : JsonConverter<RecurrenceType>
{
    public override RecurrenceType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number)
        {
            return (RecurrenceType)reader.GetInt32();
        }

        var value = reader.GetString();
        return Enum.TryParse<RecurrenceType>(value, ignoreCase: true, out var parsed)
            ? parsed
            : throw new JsonException($"Unknown {nameof(RecurrenceType)} value '{value}'.");
    }

    public override void Write(Utf8JsonWriter writer, RecurrenceType value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString());
}
