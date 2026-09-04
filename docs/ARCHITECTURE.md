# ClassPlanner — Technical Architecture Reference

This document describes the structure, conventions, and data flow of the ClassPlanner application.
It is intended as context for an AI assistant designing or implementing new features, so that
changes are consistent with existing patterns.

## 1. Solution Overview

- **Backend**: ASP.NET Core Web API targeting **.NET 10** (`ClassPlanner.csproj`), single project, no test project currently exists.
- **Frontend**: Vite + React 19 + TypeScript SPA located in `ClientApp/`, using `@dnd-kit/core` for drag-and-drop.
- **Persistence**: Flat JSON files under `data/` (no database). Reads/writes go through a single `IDataStore` abstraction.
- **Hosting model**: The backend serves the built SPA as static files from `wwwroot/` in production. In development, Vite's dev server proxies `/api/*` calls to the ASP.NET Core backend (see `ClientApp/vite.config.ts`).
- **Solution file**: `ClassPlanner.slnx` at the repo root.

### Build commands
- Backend: `dotnet build` (or `dotnet build ClassPlanner.csproj`) from the repo root.
- Frontend: `cd ClientApp && npm run build` — runs `tsc -b && vite build`, outputs to `../wwwroot`.
- Always verify both builds after making cross-cutting changes.

## 2. Backend Architecture

### Layering
```
Controllers/          Thin HTTP layer — parses requests, calls ClassPlannerService, maps exceptions to status codes
Services/
  ClassPlannerService.cs   Single application service containing ALL business logic
  Dtos/Dtos.cs              All DTOs (request + response) used by controllers and the service
  ClassPlannerExceptions.cs Custom exceptions (NotFound, Conflict) mapped to HTTP codes in controllers
Models/                Plain domain entity classes persisted as-is to JSON
Persistence/
  IDataStore.cs         Interface: Get*/Save* methods per entity collection
  JsonDataStore.cs       JSON file implementation with per-file locking + atomic writes
  DataStoreOptions.cs    Configuration (data directory path)
Program.cs             DI registration, middleware pipeline, SPA fallback
```

**There is only one service class (`ClassPlannerService`)** — it is NOT split by entity. All CRUD,
cascade-delete, and cross-entity consistency logic lives here. New backend features should generally
add methods to this service rather than create new service classes, unless the codebase is
deliberately being refactored.

### Domain Model

| Entity | File | Notes |
|---|---|---|
| `Student` | `Models/Student.cs` | `Id`, `FirstName`, `LastName`, `Email?`, `Phone?`, `EmergencyContact?`, `Notes?` |
| `TrainingClass` | `Models/TrainingClass.cs` | `Id`, `ScheduleId` (owning schedule), `Name`, `Description?`, `InstructorId?`, `Notes?`. **No duration/location/capacity** — those live only on `ScheduledClass` entries. |
| `Schedule` | `Models/Schedule.cs` | `Id`, `Name`, `StartDate?`, `EndDate?` (optional `DateOnly`). Represents a weekly recurring schedule with no concrete dates for individual entries. |
| `ScheduledClass` | `Models/ScheduledClass.cs` | An occurrence placed on a `Schedule` at a `DayOfWeek` + `StartTime` + `Duration`. Exactly one of `TrainingClassId` or `StudentId` is set — the latter represents a **direct student appointment** with no class. Has its own optional `Location`. |
| `Enrollment` | `Models/Enrollment.cs` | Join entity: `StudentId` + `TrainingClassId` (+ `CreatedAtUtc`). Enrollments belong to the **class**, not the schedule entry — enrolling in a class enrolls the student in all scheduled occurrences of that class. |

### Key domain rules (must be preserved by new features)
1. **Classes are owned by schedules.** `GetClassesAsync(scheduleId)` filters by `TrainingClass.ScheduleId`. The left pane only shows classes for the active schedule.
2. **Duration/Location are per-schedule-entry, not per-class.** A class itself has no duration; only its `ScheduledClass` occurrences do. Multiple occurrences of the same class could theoretically have different durations/locations (though typically a class currently has one entry per schedule).
3. **Enrollments cascade.** Deleting a class removes: its `ScheduledClass` entries, and all `Enrollment` rows referencing it. Deleting a schedule removes: its `ScheduledClass` entries, its owned `TrainingClass` records, and all `Enrollment` rows for those classes. Deleting a student removes all `Enrollment` rows for that student.
4. **Self-healing referential integrity.** `GetClassDetailAsync` and `GetStudentDetailAsync` proactively detect and remove orphaned `Enrollment` rows (referencing deleted students, or classes whose schedule no longer exists) whenever that detail is loaded, persisting the cleanup immediately. New "get detail" methods that expose joined/derived data should follow this same self-healing pattern rather than assuming referential integrity always holds (JSON storage has no foreign keys).
5. **Direct student scheduling.** A `ScheduledClass` can represent a student appointment (`StudentId` set, `TrainingClassId` null) with no class involved — used for one-off/individual bookings on the calendar.
6. **Copy Schedule** deep-copies a schedule: new `Schedule`, all its `TrainingClass` records (with new ids), all `Enrollment` rows for those classes, and all `ScheduledClass` entries (re-pointed to the new ids). Name uniqueness is validated (409 Conflict) both on copy and rename.
7. **Quarter-hour precision.** Scheduled entry day/time/duration are snapped to 15-minute increments throughout (backend accepts `TimeSpan`; frontend rounds to nearest 15 min before sending).

### Controllers
- `StudentsController`: GET list/one, POST create, PUT update (`firstName`, `lastName`, `email`, `phone`, `emergencyContact`, `notes`), DELETE (cascades enrollments).
- `ClassesController`: GET list (optional `?scheduleId=`), POST create (`?scheduleId=` + body `name`), GET one, PUT update (`name`, `description`, `notes`), DELETE (cascades), POST/DELETE `/students/{studentId}` for enroll/unenroll (enroll returns **204 No Content** — important: the frontend expects no JSON body).
- `SchedulesController`: GET list/one, POST create, DELETE (cascades classes+enrollments+entries), PUT update (`startDate`, `endDate`), PUT `/name` (rename, 409 on duplicate), POST `/copy` (body `name`, 409 on duplicate), nested entries: GET one, POST create (class or student entry), PUT move/edit (`dayOfWeek`, `startTime`, `duration`, `location`), DELETE remove.

### Error handling convention
Custom exceptions (`ClassPlannerNotFoundException`, `ClassPlannerConflictException` in `Services/ClassPlannerExceptions.cs`) are thrown from the service and caught in controllers to produce 404/409 with a `{ message }` JSON body (`ApiErrorResponse`). Follow this pattern for new failure modes rather than returning raw status codes from the service layer.

### Persistence (`JsonDataStore`)
- One JSON file per collection: `data/students.json`, `data/classes.json`, `data/enrollments.json`, `data/schedules.json`, `data/scheduledClasses.json`.
- Each file has its own `SemaphoreSlim` for concurrency safety; writes are atomic (write to temp file, then replace).
- Pattern for any new entity: add `Get*Async`/`Save*Async` to `IDataStore`, implement in `JsonDataStore`, add a new file path constant.
- There is no query capability — every "Get" reads and returns the entire collection; filtering/joining happens in `ClassPlannerService`.

## 3. Frontend Architecture

### Structure
```
ClientApp/src/
  App.tsx                 Top-level state owner + orchestration (selection, CRUD handlers, drag/drop)
  App.css                 All application styling (single stylesheet, class-based conventions)
  types/models.ts          TypeScript interfaces mirroring backend DTOs
  services/api.ts          Thin fetch wrapper — one exported function per backend endpoint
  components/
	Calendar.tsx            Weekly schedule grid + schedule focus-pane toolbar (name/date editing, delete)
	CalendarSlot.tsx         Quarter-hour droppable grid cell
	ClassTile.tsx            Class card in left pane (draggable + droppable for enrollment)
	StudentTile.tsx          Student card in right pane (draggable)
	ScheduleTile.tsx         Schedule card in top pane
	ClassView.tsx            Full focus-pane view for an individual class
	DetailsPanel.tsx         Focus-pane view for student details AND scheduled-class-entry details
	format.ts                Shared time/duration parsing/formatting helpers
```

### State ownership
**`App.tsx` is the single source of truth.** It holds all top-level React state:
- `students`, `classes`, `schedules` (summaries for the panes)
- `activeScheduleId` / `activeScheduleDetail` (the schedule currently shown in the calendar)
- `selected: SelectedObject` (discriminated union — currently `{ type: 'student', id }` or `{ type: 'class', id }`; a `scheduledClass` variant is also handled at the detail level even though not shown in the snippet above — check `types/models.ts` for the authoritative union) plus derived `studentDetail` / `classDetail` / `scheduledClassDetail`
- All mutation handlers (`handleSaveStudent`, `handleSaveClass`, `handleDeleteClass`, `handleCopySchedule`, `handleScheduleClass`, `handleMoveScheduledClass`, drag-and-drop handlers, etc.)

Child components are largely presentational: they receive data + callback props and call back up to `App.tsx` to mutate state and call the API. **When adding a feature, prefer adding a handler in `App.tsx` and passing it down, rather than having leaf components call `api.ts` directly.**

### Selection & focus pane
The main layout is: tool ribbon (header) → top pane (schedule list + schedule actions) → three-column body (left pane = classes, focus pane = center, right pane = students). Clicking a class or student tile sets `selected`; an effect in `App.tsx` fetches the corresponding detail (`getClass`/`getStudent`/`getScheduledClassDetail`) and renders either `<ClassView>` (class selected) or `<DetailsPanel>` (student or scheduled-class-entry selected) in the focus pane. `ClassTile`/`StudentTile` accept an `isSelected` prop so the currently-focused tile is visually highlighted (`.tile.is-selected` in `App.css`).

### Editable-field pattern ("click to edit")
Most editable text fields (student name/email/phone/emergency contact/notes, class name/description/notes, schedule name) use a **click-to-edit** convention implemented as a small local component (`EditableText` / `EditableTextarea`, duplicated per-file rather than shared — currently defined separately in `DetailsPanel.tsx` and `ClassView.tsx`):
- Renders as plain text (with an em-dash `—` placeholder when empty) when not editing.
- Clicking swaps in an `<input>`/`<textarea>` with `autoFocus`.
- **Two save strategies exist side-by-side** — check the surrounding component before adding a new field:
  1. **Save-on-blur/Enter, immediate persistence** (student contact fields, class name, schedule name): the `onCommit` callback fires the save handler directly; there is no separate Save button for that field.
  2. **Local dirty-state + explicit Save button** (class description/notes, scheduled-entry day/time/duration/location): edits accumulate in local `useState` and a "Save Changes" button (visible only when `isDirty`) commits them all at once via `onSaveClass`/`onSaveScheduledClass`.
- `Escape` cancels the in-progress edit and reverts to the last committed value; `Enter` (single-line) or blur commits.

### Remount-on-key pattern for resetting local draft state
Components with local editing state that must reset whenever a different entity is selected (or its data reloads) are wrapped in an outer component that renders an inner "Content" component keyed by a string derived from the entity's id **and** its persisted field values (e.g. `ClassView`/`ClassViewContent`, `Calendar`'s toolbar). This forces React to remount the inner component (resetting `useState`) instead of requiring a `useEffect` to resynchronize state — **prefer this pattern over effects** when adding new editable detail panes.

### Drag-and-drop (`@dnd-kit/core`)
- Single `<DndContext>` in `App.tsx` with `onDragStart`/`onDragEnd` handlers that inspect `active.data.current.type` (`'student'` or `'class'`) to decide behavior.
- Draggable sources: `StudentTile` (drag a student), `ClassTile` (drag a class onto the calendar).
- Droppable targets: `ClassTile` (drop a student to enroll), `ClassView`/scheduled-class focus pane (drop a student to enroll, mirrors `ClassTile` behavior), `CalendarSlot` (15-minute grid cells — drop a class or student to schedule it at that day/time).
- Visual feedback classes: `.is-dragging`, `.is-drop-ready`, `.is-drop-rejected`, `.calendar-quarter-slot` highlighting — driven by `useDraggable`/`useDroppable` state (`isDragging`, `isOver`, `active`).

### Data refresh conventions
There is no global cache/store (no React Query, no Redux) — after any mutation, the relevant list(s) are explicitly re-fetched or patched via `setState`. Important cross-cutting refresh rules already established:
- Deleting a class or schedule, or copying a schedule, **must refresh `students`** (via `api.getStudents()`) since it changes `enrolledClassCount` shown on student tiles.
- Deleting a class also refreshes `schedules` (entry counts) and the active schedule's detail (calendar view).
- Saving a class's name also patches the `classes` summary list so the left-pane tile reflects the new name immediately.
- When adding a new mutation, think through **which summary lists display derived/aggregate data (counts, names) affected by the change** and refresh them the same way.

### Styling conventions (`App.css`)
- Single stylesheet, BEM-ish flat class names (no CSS modules/styled-components).
- Reusable primitives: `.tile` (+ `.is-dragging`, `.is-selected`, `.is-drop-ready`/`.is-drop-rejected` for `.class-tile`), `.editable-text` / `.editable-text-placeholder`, `.class-view-textarea` / `.class-view-input`.
- Layout containers: `.tool-ribbon`, `.app-main`, `.top-pane` (+ `.tile-row` independently scrollable, `.top-pane-actions` fixed 2x2 grid), `.left-pane`, `.right-pane`, `.focus-pane`.
- New editable fields/components should reuse `.editable-text`/`.class-view-textarea`/`.class-view-input` rather than introducing new input styling.

## 4. Conventions Checklist for New Features

When implementing a new feature, follow these established patterns:

1. **Backend**: add DTOs to `Services/Dtos/Dtos.cs`, add a method to `ClassPlannerService`, expose it via the relevant controller, using `ClassPlannerNotFoundException`/`ClassPlannerConflictException` for error cases.
2. **Cascade/consistency**: if the feature adds a new relationship, add corresponding cleanup logic to the relevant `Delete*Async` methods and consider whether a "get detail" method needs self-healing logic for orphaned references.
3. **Frontend types**: mirror new/changed DTO shapes in `ClientApp/src/types/models.ts`.
4. **Frontend API client**: add a thin wrapper function in `ClientApp/src/services/api.ts` (one function per endpoint, following the existing naming/signature style).
5. **State/handlers**: add state and a `handle*` function in `App.tsx`; pass callbacks down as props rather than calling `api.ts` from deep child components.
6. **Editable fields**: decide between immediate-commit (`EditableText`/`EditableTextarea`, save-on-blur/Enter) vs. batched dirty-state + explicit Save button, matching the nearest existing analog in `ClassView.tsx` or `DetailsPanel.tsx`.
7. **Refresh derived data**: after mutations, refresh any summary lists whose displayed counts/names could be affected (see "Data refresh conventions" above).
8. **Verify both builds**: `dotnet build` for the backend and `npm run build` in `ClientApp/` for the frontend before considering a change complete.
