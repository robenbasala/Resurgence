export const CELL_NOTE_BODY_MAX = 16000;
const MAX_NOTES_PER_CELL = 5000;

/**
 * Stable key for one calendar cell: MR + day + auth band + auth # + LOC + patient
 * (matches how report rows are grouped — MR + date alone is not enough).
 */
export function buildCellStateKey({
  mrNumber,
  date,
  authStart,
  authEnd,
  authorizationNumber,
  locSummary,
  patientId
}) {
  const parts = [
    String(mrNumber ?? "").trim(),
    String(date ?? "").trim(),
    String(authStart ?? "").trim(),
    String(authEnd ?? "").trim(),
    String(authorizationNumber ?? "").trim(),
    String(locSummary ?? "").trim(),
    String(patientId ?? "").trim()
  ];
  return parts.join("\u001f");
}

function newNoteId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** New persisted note (after trim + clamp). Null if empty. */
export function createNoteFromBody(text) {
  const body = clampBody(String(text ?? "").trim());
  if (!body) return null;
  const t = Date.now();
  return normalizeNote({ id: newNoteId(), body, createdAt: t, updatedAt: t, deleted: false });
}

function clampBody(text) {
  const s = String(text ?? "");
  return s.length > CELL_NOTE_BODY_MAX ? s.slice(0, CELL_NOTE_BODY_MAX) : s;
}

/** One persisted note (may include soft-delete flags). */
export function normalizeNote(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : newNoteId();
  const deleted = Boolean(raw.deleted);
  const body = clampBody(raw.body ?? raw.text ?? "");
  if (!String(body).trim()) return null;
  const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now();
  const updatedAt = Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : createdAt;
  const deletedAtRaw = Number(raw.deletedAt);
  const deletedAt = deleted && Number.isFinite(deletedAtRaw) ? deletedAtRaw : undefined;
  if (deleted) {
    return { id, body, createdAt, updatedAt, deleted: true, deletedAt: deletedAt ?? updatedAt };
  }
  return { id, body, createdAt, updatedAt };
}

/** Cell entry: many notes + complete flag */
export function normalizeCellState(raw) {
  if (!raw || typeof raw !== "object") {
    return { completed: false, notes: [] };
  }

  const completed = Boolean(raw.completed);

  if (Array.isArray(raw.notes)) {
    const mapped = raw.notes
      .map((n) => normalizeNote(n))
      .filter(Boolean)
      .filter((n) => n.body.length > 0);
    const seen = new Set();
    const notes = [];
    for (const n of mapped) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      notes.push(n);
      if (notes.length >= MAX_NOTES_PER_CELL) break;
    }
    return { completed, notes };
  }

  const legacyComment = typeof raw.comment === "string" ? raw.comment.trim() : "";
  if (legacyComment) {
    const t = Date.now();
    return {
      completed,
      notes: [{ id: newNoteId(), body: clampBody(legacyComment), createdAt: t, updatedAt: t }]
    };
  }

  return { completed, notes: [] };
}

export function getCellStateEntry(map, cellKey) {
  if (!cellKey || !map) return null;
  const v = map[cellKey];
  return normalizeCellState(v);
}

export function cellHasNotes(entry) {
  const e = normalizeCellState(entry);
  return (
    Array.isArray(e.notes) &&
    e.notes.some((n) => n && !n.deleted && String(n.body || "").trim().length > 0)
  );
}

/** Active (non–soft-deleted) notes, newest first */
export function sortNotesForDisplay(notes) {
  if (!Array.isArray(notes)) return [];
  const active = notes.filter((n) => n && !n.deleted);
  return [...active].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
