using ClassPlanner.Persistence;
using ClassPlanner.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.Configure<DataStoreOptions>(builder.Configuration.GetSection(DataStoreOptions.SectionName));
builder.Services.AddSingleton<IDataStore, JsonDataStore>();
builder.Services.AddScoped<ClassPlannerService>();

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Seed sample data if the JSON files are empty. Existing data is never overwritten.
using (var scope = app.Services.CreateScope())
{
    var seedService = scope.ServiceProvider.GetRequiredService<ClassPlannerService>();
    await seedService.SeedDataIfEmptyAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthorization();

app.MapControllers();

// Serve the React SPA for any non-API route that doesn't match a static file.
app.MapFallbackToFile("index.html");

app.Run();
