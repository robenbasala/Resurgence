const dayjs = require("dayjs");
const { getPool, sql } = require("../config/db");
const { sessionHoursView } = require("../config/env");

function assertSafeViewName(viewName) {
  if (!/^[A-Za-z0-9_.\[\]]+$/.test(viewName)) {
    throw new Error("Invalid SESSION_HOURS_VIEW value.");
  }
}

async function fetchReportRecords({ startDate, endDate, name, mrNumber }) {
  assertSafeViewName(sessionHoursView);
  const pool = await getPool();
  const request = pool.request();

  request.input("startDate", sql.Date, startDate);
  request.input("endDate", sql.Date, endDate);
  request.input("name", sql.NVarChar(255), name || null);
  request.input("mrNumber", sql.NVarChar(100), mrNumber || null);

  const query = `
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
      DayDate,
      TotalHours
    FROM ${sessionHoursView}
    WHERE CAST(DayDate AS date) BETWEEN @startDate AND @endDate
      AND (@name IS NULL OR Name LIKE '%' + @name + '%')
      AND (@mrNumber IS NULL OR CAST([MR Number] AS nvarchar(100)) LIKE '%' + @mrNumber + '%')
    ORDER BY
      CAST([MR Number] AS nvarchar(100)),
      CAST(AuthStart AS date),
      CAST(AuthEnd AS date),
      COALESCE(CAST(LOC AS nvarchar(200)), ''),
      Name,
      CAST(DayDate AS date)
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

function normalizeDate(dateValue) {
  if (!dateValue) return null;
  return dayjs(dateValue).format("YYYY-MM-DD");
}

module.exports = {
  fetchReportRecords,
  fetchAvailableYears,
  normalizeDate
};
