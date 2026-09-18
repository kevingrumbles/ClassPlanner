using ClassPlanner.Persistence;
using ClassPlanner.Services;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.Configure<DataStoreOptions>(builder.Configuration.GetSection(DataStoreOptions.SectionName));
builder.Services.Configure<GoogleOptions>(builder.Configuration.GetSection(GoogleOptions.SectionName));
builder.Services.AddSingleton<IDataStore, JsonDataStore>();
builder.Services.AddScoped<ClassPlannerService>();
builder.Services.AddScoped<GoogleCalendarService>();
builder.Services.AddHttpClient<GoogleCalendarService>();

builder.Services.AddControllers()
    // Serialize RecurrenceType by name ("Once"/"Weekly") so it matches the frontend's string
    // union. Applied only to this enum: DayOfWeek must stay numeric because the frontend
    // indexes into day arrays with it (0 = Sunday ... 6 = Saturday).
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new RecurrenceTypeJsonConverter()));
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

//// Seed sample data if the JSON files are empty. Existing data is never overwritten.
//using (var scope = app.Services.CreateScope())
//{
//    var seedService = scope.ServiceProvider.GetRequiredService<ClassPlannerService>();
//    await seedService.SeedDataIfEmptyAsync();
//}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// Serve the React SPA for any non-API route that doesn't match a static file.
app.MapFallbackToFile("index.html");

app.Run();
