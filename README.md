# Class Planner

Class Planner is a scheduling application for managing students, training classes, and a weekly class
calendar. Users can drag students onto classes to enroll them, and drag classes onto calendar slots to
schedule them.

## Project Structure

```
ClassPlanner/
├── Controllers/        ASP.NET Core API controllers (thin — delegate to ClassPlannerService)
├── Models/              Domain models (Student, TrainingClass, Enrollment, ClassSchedule)
├── Persistence/         IDataStore abstraction + JsonDataStore (JSON file) implementation
├── Services/            ClassPlannerService — application/business logic
├── ClientApp/            Vite + React + TypeScript frontend
├── data/                 JSON data files (students.json, classes.json, enrollments.json, schedules.json)
├── Program.cs
└── appsettings.json
```

## Running the Application

### Backend (ASP.NET Core API)

From the repository root:

```powershell
dotnet run
```

This starts the API (see `Properties/launchSettings.json` for the configured URL, e.g. `http://localhost:5192`).
Swagger/OpenAPI is available in development at `/openapi/v1.json` (via `AddOpenApi`/`MapOpenApi`).

**Debugging in Visual Studio:** Both launch profiles have `launchBrowser` enabled, and the project
automatically runs `npm install` (if needed) and `npm run build` for `ClientApp` before each build inside
Visual Studio, so the latest frontend is built into `wwwroot`. Pressing F5 builds the app and opens a
browser to it automatically — no separate frontend process is required for basic debugging.

### Frontend (Vite dev server)

In a separate terminal:

```powershell
cd ClientApp
npm install
npm run dev
```

The Vite dev server proxies all `/api/*` requests to the ASP.NET Core backend (configured in
`ClientApp/vite.config.ts`), so the React app can simply call relative URLs like `/api/students`.

## Data Storage

Data is stored as human-readable, indented JSON under the `data/` directory (configurable via the
`DataStore:DataDirectory` setting in `appsettings.json`). If a JSON file doesn't exist, it is treated as
an empty collection. On first run, sample students, classes, enrollments, and schedules are seeded if the
files are empty; existing data is never overwritten.

## How IDataStore Works

`IDataStore` (in `Persistence/IDataStore.cs`) is the single persistence abstraction used by the application.
It exposes simple get/save operations for students, classes, enrollments, and schedules. The current
implementation, `JsonDataStore`, reads and writes JSON files with an in-process lock per file (to avoid
concurrent read/modify/write corruption) and atomic file replacement (write to a temp file, then move).

The intended layering is:

```
Controller → ClassPlannerService → IDataStore → JsonDataStore → JSON files
```

### Future SQL Implementation

Because all persistence goes through `IDataStore`, a future `SqlDataStore` implementation (backed by SQL
Server or another database) can be substituted by registering it in `Program.cs` in place of
`JsonDataStore`:

```csharp
builder.Services.AddSingleton<IDataStore, SqlDataStore>();
```

No changes would be required in `ClassPlannerService`, the controllers, or the React frontend.

## Frontend/Backend Communication

The React app communicates with the API exclusively through `ClientApp/src/services/api.ts`, which issues
`fetch` calls to relative paths (`/api/students`, `/api/classes`, `/api/schedule`, etc.). No component makes
raw `fetch` calls directly, and no URLs are hard-coded to a specific host or port.

## Production Build & Hosting

Build the React app for production:

```powershell
cd ClientApp
npm run build
```

This outputs static files to `wwwroot/` (configured via `build.outDir` in `vite.config.ts`). When the
ASP.NET Core application runs, it serves these static files and falls back to `index.html` for any
non-API route, while `/api/*` continues to be routed to the API controllers (configured in `Program.cs`
via `UseStaticFiles` and `MapFallbackToFile`).

## Drag and Drop

The frontend uses [`@dnd-kit`](https://dndkit.com/) for all primary drag-and-drop interactions:

- Drag a student onto a class to enroll them.
- Drag a class onto a calendar slot to schedule it.
- Drag a scheduled class to a different calendar slot to move it.

Accessible alternatives (select + button controls) are available in the details panel for enrolling,
removing, scheduling, and moving classes without a mouse.
