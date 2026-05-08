const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { getPool, sql } = require("../config/db");

dayjs.extend(utc);
const { sessionHoursView } = require("../config/env");

function assertSafeViewName(viewName) {
  if (!/^[A-Za-z0-9_.\[\]]+$/.test(viewName)) {
    throw new Error("Invalid SESSION_HOURS_VIEW value.");
  }
}

async function fetchReportRecords({ startDate, endDate, name, mrNumber, locationIds }) {
  assertSafeViewName(sessionHoursView);
  const pool = await getPool();
  const request = pool.request();

  request.input("startDate", sql.Date, startDate);
  request.input("endDate", sql.Date, endDate);
  request.input("name", sql.NVarChar(255), name || null);
  request.input("mrNumber", sql.NVarChar(100), mrNumber || null);
  request.input(
    "locationIdsCsv",
    sql.NVarChar(sql.MAX),
    Array.isArray(locationIds) && locationIds.length > 0 ? locationIds.join(",") : null
  );

  const query = `
    DECLARE @endExclusive date = DATEADD(day, 1, @endDate);
    ;WITH selectedLocations AS (
      SELECT DISTINCT TRY_CONVERT(int, value) AS location_id
      FROM STRING_SPLIT(@locationIdsCsv, ',')
      WHERE TRY_CONVERT(int, value) IS NOT NULL
    )

    SELECT
      UniqueKey,
      [MR Number] AS mrNumber,
      PatientId,
      Name,
      Admit,
      Discharge,
      AuthorizationNumber,
      LOC,
      AuthStart,
      AuthEnd,
      location_id,
      location_name,
      DayDate,
      SUM(COALESCE(TotalHours, 0)) AS TotalHours
    FROM ${sessionHoursView}
    WHERE DayDate >= @startDate
      AND DayDate < @endExclusive
      AND (@name IS NULL OR Name LIKE '%' + @name + '%')
      AND (@mrNumber IS NULL OR CONVERT(nvarchar(100), [MR Number]) LIKE '%' + @mrNumber + '%')
      AND (
        @locationIdsCsv IS NULL
        OR EXISTS (
          SELECT 1
          FROM selectedLocations sl
          WHERE sl.location_id = location_id
        )
      )
    GROUP BY
      UniqueKey,
      [MR Number],
      PatientId,
      Name,
      Admit,
      Discharge,
      AuthorizationNumber,
      LOC,
      AuthStart,
      AuthEnd,
      location_id,
      location_name,
      DayDate
    OPTION (RECOMPILE);
  `;

  const result = await request.query(query);
  return result.recordset;
}

async function fetchAvailableYears() {
  assertSafeViewName(sessionHoursView);
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT DISTINCT YEAR(CAST(DayDate AS date)) AS reportYear
    FROM ${sessionHoursView}
    WHERE DayDate IS NOT NULL
    ORDER BY reportYear DESC
  `);

  return result.recordset
    .map((item) => item.reportYear)
    .filter((item) => Number.isInteger(item));
}

/**
 * Calendar YYYY-MM-DD for SQL date/datetime values.
 * mssql often returns JS Date at UTC midnight for a SQL `date`; using local dayjs shifts
 * one day behind in US timezones (e.g. 2025-12-26Z → "2025-12-25"). Use UTC calendar date.
 */
function normalizeDate(dateValue) {
  if (dateValue == null || dateValue === "") return null;

  if (typeof dateValue === "string") {
    const m = String(dateValue).trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }

  const d = dayjs.utc(dateValue);
  if (!d.isValid()) return null;
  return d.format("YYYY-MM-DD");
}

module.exports = {
  fetchReportRecords,
  fetchAvailableYears,
  normalizeDate
};
