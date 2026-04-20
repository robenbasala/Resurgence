# Session Hours Monthly Report (Full Stack)

Separated full-stack project:

- `backend`: Node.js + Express + SQL Server (`mssql`)
- `frontend`: React + Vite + Tailwind CSS

This app renders a month-based session-hours matrix (patient rows x day columns) with business-rule color logic translated from Power Apps.

## Project Structure

```text
/backend
/frontend
```

## Features

- REST API (`/api/report`, `/api/report/meta`, `/api/health`)
- SQL Server view-based source data with configurable view name
- Parameterized SQL queries (safe filter handling)
- Grouping by patient/MR Number
- Dynamic days for selected month
- Sticky left patient columns + horizontally scrollable day columns
- Exact rule-order color logic from your formula
- Year/month/name/MR filters
- Debounced text filters
- CSV export
- Loading, empty, and error states
- Print button (`window.print`)

## Backend Setup (`/backend`)

1. Copy env file:
   - Windows PowerShell:
     - `Copy-Item .env.example .env`
2. Install dependencies:
   - `npm install`
3. Update `.env` with your SQL Server details:

```env
PORT=5000
DB_SERVER=localhost
DB_DATABASE=YourDatabase
DB_USER=sa
DB_PASSWORD=yourStrongPassword
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
SESSION_HOURS_VIEW=dbo.vwSessionHours
```

4. Run backend:
   - Dev: `npm run dev`
   - Prod: `npm start`

### Where to set SQL Server connection details

Set all DB credentials and host values in `backend/.env`:

- `DB_SERVER`
- `DB_DATABASE`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`
- `DB_ENCRYPT`
- `DB_TRUST_SERVER_CERTIFICATE`

### Where to set SQL VIEW name

Set `SESSION_HOURS_VIEW` in `backend/.env`.
Example: `SESSION_HOURS_VIEW=dbo.vwSessionHours`

## Frontend Setup (`/frontend`)

1. Copy env file:
   - Windows PowerShell:
     - `Copy-Item .env.example .env`
2. Install dependencies:
   - `npm install`
3. Update `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

4. Run frontend:
   - Dev: `npm run dev`
   - Build: `npm run build`
   - Preview: `npm run preview`

## API Endpoints

### `GET /api/report`

Query params:

- `year` (required by behavior; defaults current year if missing)
- `month` (1-12; defaults current month if missing)
- `name` (optional partial match)
- `mrNumber` (optional partial match)

Returns:

- `year`, `month`
- `days`: array of ISO date strings for selected month
- `rows`: grouped patient rows with `dailyEntries` object keyed by date

### `GET /api/report/meta`

Returns:

- `years`: available years from `DayDate`
- `months`: `[1..12]`

### `GET /api/health`

Returns simple status JSON.

## Business Logic Translation Notes

Per cell:

1. Hours default to `0` if no record exists for MR + day.
2. Date/color rule order:
   - Outside admit/discharge range => black
   - Sunday => gray
   - `DTX` => green if `hours >= 6`, else blue
   - `RTC` => yellow if `hours >= 6`, else blue
   - `PHP` => purple if `hours >= 6`, else blue
   - `IOP` => pink if `hours >= 3`, else blue
   - fallback => white
3. Text color auto-adjusts for dark backgrounds.

## Notes on Data Behavior

- SQL rows are grouped by MR Number.
- If multiple records exist for same MR + day:
  - `TotalHours` is summed.
  - `LOC` uses first non-empty LOC encountered for that day.
- Null `TotalHours` is treated as `0`.
- Null `LOC` is treated as empty string.

## Run Order

1. Start backend in `backend`
2. Start frontend in `frontend`
3. Open frontend URL shown by Vite
