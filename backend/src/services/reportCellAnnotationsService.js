const {
  fetchAnnotationsByDateRange,
  upsertAnnotation,
  toSqlDate
} = require("../repositories/reportCellAnnotationsRepository");
const { getMonthRange, getMonthSpanRange } = require("../utils/date");

function parseNotesJson(raw) {
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildAnnotationsMap(rows) {
  const annotations = {};
  for (const row of rows) {
    const key = row.CellKey;
    if (!key) continue;
    annotations[key] = {
      completed: Boolean(row.Completed),
      notes: parseNotesJson(row.NotesJson)
    };
  }
  return annotations;
}

async function listAnnotationsForReportQuery(query) {
  const hasRange = query.fromYear && query.fromMonth && query.toYear && query.toMonth;
  const { start, end } = hasRange
    ? getMonthSpanRange(query.fromYear, query.fromMonth, query.toYear, query.toMonth)
    : getMonthRange(query.year, query.month);

  const rows = await fetchAnnotationsByDateRange({
    startDate: start,
    endDate: end,
    mrNumber: query.mrNumber || null
  });
  return { annotations: buildAnnotationsMap(rows) };
}

async function saveAnnotation(payload) {
  const cellDate = toSqlDate(payload.cellDate);
  if (!cellDate) {
    const err = new Error("cellDate is required");
    err.statusCode = 400;
    throw err;
  }

  const notesJson = JSON.stringify(Array.isArray(payload.notes) ? payload.notes : []);

  await upsertAnnotation({
    cellKey: payload.cellKey,
    mrNumber: String(payload.mrNumber || "").slice(0, 200),
    cellDate,
    authStart: toSqlDate(payload.authStart),
    authEnd: toSqlDate(payload.authEnd),
    authorizationNumber: payload.authorizationNumber != null ? String(payload.authorizationNumber).slice(0, 400) : null,
    locSummary: payload.locSummary != null ? String(payload.locSummary).slice(0, 400) : null,
    patientId: payload.patientId != null ? String(payload.patientId).slice(0, 100) : null,
    completed: Boolean(payload.completed),
    notesJson
  });

  return { ok: true };
}

module.exports = {
  listAnnotationsForReportQuery,
  saveAnnotation
};
