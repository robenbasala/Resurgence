const dayjs = require("dayjs");
const { AppError } = require("../utils/errors");
const { validateReportQuery } = require("./reportValidator");

const MAX_CELL_KEY = 512;
const MAX_NOTES = 5000;
const NOTE_BODY_MAX = 16000;

function validateAnnotationListQuery(query) {
  return validateReportQuery(query);
}

function validateNoteItem(note, index) {
  if (!note || typeof note !== "object") {
    throw new AppError(`notes[${index}] must be an object`, 400);
  }
  const id = typeof note.id === "string" ? note.id.trim() : "";
  if (!id || id.length > 80) {
    throw new AppError(`notes[${index}].id invalid`, 400);
  }
  const body = typeof note.body === "string" ? note.body : "";
  if (!body.trim()) {
    throw new AppError(`notes[${index}].body cannot be empty`, 400);
  }
  if (body.length > NOTE_BODY_MAX) {
    throw new AppError(`notes[${index}].body too long`, 400);
  }
  const createdAt = Number(note.createdAt);
  const updatedAt = Number(note.updatedAt);
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) {
    throw new AppError(`notes[${index}] missing timestamps`, 400);
  }
  const deleted = Boolean(note.deleted);
  if (!deleted) {
    return { id, body, createdAt, updatedAt };
  }
  const deletedAt = Number(note.deletedAt);
  const resolvedDeletedAt = Number.isFinite(deletedAt) ? deletedAt : updatedAt;
  return { id, body, createdAt, updatedAt, deleted: true, deletedAt: resolvedDeletedAt };
}

function validateAnnotationPutBody(body) {
  if (!body || typeof body !== "object") {
    throw new AppError("JSON body required", 400);
  }

  const cellKey = typeof body.cellKey === "string" ? body.cellKey.trim() : "";
  if (!cellKey || cellKey.length > MAX_CELL_KEY) {
    throw new AppError("cellKey is required (max 512 chars)", 400);
  }

  const mrNumber = typeof body.mrNumber === "string" ? body.mrNumber.trim() : "";
  if (!mrNumber || mrNumber.length > 200) {
    throw new AppError("mrNumber is required", 400);
  }

  const cellDate = typeof body.cellDate === "string" ? body.cellDate.trim() : "";
  if (!cellDate || !dayjs(cellDate, "YYYY-MM-DD", true).isValid()) {
    throw new AppError("cellDate must be YYYY-MM-DD", 400);
  }

  const completed = Boolean(body.completed);

  if (!Array.isArray(body.notes)) {
    throw new AppError("notes must be an array", 400);
  }
  if (body.notes.length > MAX_NOTES) {
    throw new AppError(`notes may have at most ${MAX_NOTES} items`, 400);
  }

  const notes = body.notes.map((n, i) => validateNoteItem(n, i));

  return {
    cellKey,
    mrNumber,
    cellDate,
    authStart: body.authStart != null ? String(body.authStart).trim() : null,
    authEnd: body.authEnd != null ? String(body.authEnd).trim() : null,
    authorizationNumber:
      body.authorizationNumber != null ? String(body.authorizationNumber).trim() : null,
    locSummary: body.locSummary != null ? String(body.locSummary).trim() : null,
    patientId: body.patientId != null ? String(body.patientId).trim() : null,
    completed,
    notes
  };
}

module.exports = {
  validateAnnotationListQuery,
  validateAnnotationPutBody
};
