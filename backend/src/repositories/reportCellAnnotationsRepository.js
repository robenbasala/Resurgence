const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { getPool, sql } = require("../config/db");

dayjs.extend(utc);

function toSqlDate(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const m = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = dayjs.utc(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
}

async function fetchAnnotationsByDateRange({ startDate, endDate, mrNumber }) {
  const pool = await getPool();
  const request = pool.request();
  request.input("startDate", sql.Date, startDate);
  request.input("endDate", sql.Date, endDate);
  request.input("mrNumber", sql.NVarChar(100), mrNumber || null);

  const result = await request.query(`
    SELECT
      CellKey,
      MrNumber,
      CellDate,
      AuthStart,
      AuthEnd,
      AuthorizationNumber,
      LocSummary,
      PatientId,
      Completed,
      NotesJson
    FROM dbo.ReportCellAnnotations
    WHERE CellDate >= @startDate
      AND CellDate <= @endDate
      AND (@mrNumber IS NULL OR MrNumber LIKE '%' + @mrNumber + '%')
  `);

  return result.recordset;
}

async function upsertAnnotation(row) {
  const pool = await getPool();
  const request = pool.request();

  request.input("cellKey", sql.NVarChar(512), row.cellKey);
  request.input("mrNumber", sql.NVarChar(200), row.mrNumber);
  request.input("cellDate", sql.Date, row.cellDate);
  request.input("authStart", sql.Date, row.authStart);
  request.input("authEnd", sql.Date, row.authEnd);
  request.input("authorizationNumber", sql.NVarChar(400), row.authorizationNumber);
  request.input("locSummary", sql.NVarChar(400), row.locSummary);
  request.input("patientId", sql.NVarChar(100), row.patientId);
  request.input("completed", sql.Bit, row.completed ? 1 : 0);
  request.input("notesJson", sql.NVarChar(sql.MAX), row.notesJson || "[]");

  await request.query(`
    MERGE dbo.ReportCellAnnotations AS t
    USING (SELECT @cellKey AS CellKey) AS s ON t.CellKey = s.CellKey
    WHEN MATCHED THEN
      UPDATE SET
        MrNumber = @mrNumber,
        CellDate = @cellDate,
        AuthStart = @authStart,
        AuthEnd = @authEnd,
        AuthorizationNumber = @authorizationNumber,
        LocSummary = @locSummary,
        PatientId = @patientId,
        Completed = @completed,
        NotesJson = @notesJson,
        UpdatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
      INSERT (CellKey, MrNumber, CellDate, AuthStart, AuthEnd, AuthorizationNumber, LocSummary, PatientId, Completed, NotesJson, UpdatedAt)
      VALUES (@cellKey, @mrNumber, @cellDate, @authStart, @authEnd, @authorizationNumber, @locSummary, @patientId, @completed, @notesJson, SYSUTCDATETIME());
  `);
}

module.exports = {
  fetchAnnotationsByDateRange,
  upsertAnnotation,
  toSqlDate
};
