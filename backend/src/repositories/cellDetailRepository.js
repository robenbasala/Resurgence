const { getPool, sql } = require("../config/db");

async function fetchEvaluationsForCell({ mrNumber, date }) {
  const pool = await getPool();
  const request = pool.request();
  request.input("mrNumber", sql.NVarChar(100), mrNumber);
  request.input("cellDate", sql.Date, date);

  /*
   * Kipu list: billable + completed only; MR from patients; calendar day = local date of start_time
   * (same idea as CAST(DATEADD(HOUR, 0, start_time) AS DATE) in source list query).
   */
  const query = `
    SELECT TOP (500)
      CASE
        WHEN CHARINDEX(N':', CAST(el.patient_casefile_id AS nvarchar(max))) > 0
        THEN LEFT(
          CAST(el.patient_casefile_id AS nvarchar(max)),
          CHARINDEX(N':', CAST(el.patient_casefile_id AS nvarchar(max))) - 1
        )
        ELSE NULLIF(LTRIM(RTRIM(CAST(el.patient_casefile_id AS nvarchar(512)))), N'')
      END AS PatientId,
      CASE
        WHEN el.end_time IS NULL OR LTRIM(RTRIM(CAST(el.end_time AS nvarchar(100)))) = N''
        THEN 0
        ELSE DATEDIFF(MINUTE, DATEADD(HOUR, 0, el.start_time), DATEADD(HOUR, 0, el.end_time))
      END AS Duration,
      CAST(DATEADD(HOUR, 0, el.start_time) AS DATE) AS EvaluationDate,
      el.start_time,
      el.end_time,
      el.CompanyId,
      el.patient_casefile_id,
      p.mr_number,
      el.status,
      el.billable,
      CAST(
        CASE
          WHEN el.end_time IS NULL OR LTRIM(RTRIM(CAST(el.end_time AS nvarchar(100)))) = N''
          THEN 0
          ELSE DATEDIFF(MINUTE, DATEADD(HOUR, 0, el.start_time), DATEADD(HOUR, 0, el.end_time))
        END AS FLOAT
      ) / 60.0 AS ReportDurationHours
    FROM dbo.Kipu_EvaluationsList AS el
    INNER JOIN dbo.Kipu_PatientsList AS p ON el.patient_casefile_id = p.casefile_id
    WHERE el.billable = 1
      AND el.status = N'Completed'
      AND LTRIM(RTRIM(CAST(p.mr_number AS nvarchar(100)))) = LTRIM(RTRIM(@mrNumber))
      AND CAST(DATEADD(HOUR, 0, el.start_time) AS DATE) = @cellDate
    ORDER BY el.start_time
  `;

  const result = await request.query(query);
  return result.recordset;
}

async function fetchSessionsForCell({ mrNumber, date }) {
  const pool = await getPool();
  const request = pool.request();
  request.input("mrNumber", sql.NVarChar(100), mrNumber);
  request.input("cellDate", sql.Date, date);

  /* Same calendar bucket as report SessAgg: local date from SessionEndTime (UTC-8) */
  const query = `
    SELECT TOP (500)
      sp.PatientID,
      sp.Present,
      sp.Note,
      sp.SessionStartTime,
      sp.SessionEndTime,
      sp.SessionId,
      sp.CompanyId,
      sp.UpdateVersion,
      sp.IsDeleted,
      p.mr_number,
      CONVERT(date, DATEADD(HOUR, -8, sp.SessionEndTime)) AS SessionAggDate,
      CAST(DATEDIFF(MINUTE, sp.SessionStartTime, sp.SessionEndTime) AS float)
        * CAST(ISNULL(sp.Present, 0) AS float) / 60.0 AS SessionHoursRow
    FROM dbo.Kipu_Sessions_Patients sp
    INNER JOIN dbo.Kipu_PatientsList p ON sp.PatientID = p.PatientId
    WHERE LTRIM(RTRIM(CAST(p.mr_number AS nvarchar(100)))) = LTRIM(RTRIM(@mrNumber))
      AND CONVERT(date, DATEADD(HOUR, -8, sp.SessionEndTime)) = @cellDate
      AND ISNULL(sp.IsDeleted, 0) <> 1
      AND sp.SessionEndTime IS NOT NULL
    ORDER BY sp.SessionEndTime DESC, sp.SessionStartTime DESC
  `;

  const result = await request.query(query);
  return result.recordset;
}

module.exports = {
  fetchEvaluationsForCell,
  fetchSessionsForCell
};
