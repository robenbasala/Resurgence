import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { fetchCellDetails } from "../api/reportApi";
import { CELL_NOTE_BODY_MAX, createNoteFromBody, sortNotesForDisplay } from "../utils/cellStateStorage";

function formatDt(value) {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("M/D/YYYY h:mm A") : String(value);
}

function truncate(text, max = 240) {
  if (text == null || text === "") return "—";
  const s = String(text);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function toMillis(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const d = dayjs(value);
  return d.isValid() ? d.valueOf() : Number.MAX_SAFE_INTEGER;
}

function normalizeStatus(value) {
  if (value == null) return "";
  return String(value).trim();
}

function isPendingStatus(value) {
  const s = normalizeStatus(value).toLowerCase();
  return s.includes("pending") || s.includes("scheduled") || s.includes("incomplete");
}

function getSessionStatus(s) {
  const statusRaw = s.Status ?? s.status;
  if (statusRaw != null && String(statusRaw).trim() !== "") return String(statusRaw);
  if (isSessionPresentFalse(s)) return "Not Present";
  const p = s.Present ?? s.present;
  if (p === 1 || p === true || String(p) === "1") return "Completed";
  if (p === 0 || p === false || String(p) === "0") return "Pending";
  return "—";
}

function getSessionName(s) {
  return s.GroupSessionTitle ?? s.groupSessionTitle ?? s.Name ?? s.SessionName ?? s.sessionName ?? "Session";
}

function getSessionProvider(s) {
  return s.Provider ?? s.ProviderName ?? s.providerName ?? s.StaffName ?? "—";
}

function getSessionTimeRange(s) {
  return `${formatDt(s.SessionStartTime ?? s.sessionStartTime)} → ${formatDt(s.SessionEndTime ?? s.sessionEndTime)}`;
}

function getEvaluationName(ev) {
  return ev.Name ?? ev.name ?? ev.EvaluationName ?? ev.evaluationName ?? "Evaluation";
}

function getEvaluationProvider(ev) {
  return ev.Provider ?? ev.ProviderName ?? ev.providerName ?? ev.Clinician ?? "—";
}

function getEvaluationStatus(ev) {
  return ev.status ?? ev.Status ?? "—";
}

function getEvaluationTimeRange(ev) {
  return `${formatDt(ev.start_time ?? ev.StartTime)} → ${formatDt(ev.end_time ?? ev.EndTime)}`;
}

/** Hours as number, or null if unknown (evaluations from view / list). */
function getEvaluationDurationHours(ev) {
  if (!ev) return null;
  const durH = ev.ReportDurationHours ?? ev.reportDurationHours;
  if (durH != null && Number.isFinite(Number(durH))) return Number(durH);
  const dur = ev.Duration ?? ev.duration;
  if (dur != null && Number.isFinite(Number(dur))) return Number(dur) / 60;
  const dm = ev.DurationMinutes ?? ev.durationMinutes;
  if (dm != null && Number.isFinite(Number(dm))) return Number(dm) / 60;
  if (ev.start_time != null && ev.end_time != null) {
    const mins = dayjs(ev.end_time).diff(dayjs(ev.start_time), "minute");
    if (Number.isFinite(mins) && mins >= 0) return mins / 60;
  }
  return null;
}

/** Present is explicitly false / 0 (not unknown). */
function isSessionPresentFalse(s) {
  if (!s) return false;
  const p = s.Present ?? s.present;
  if (p === false) return true;
  if (p === true) return false;
  if (p === null || p === undefined) return false;
  if (typeof p === "string") {
    const low = p.trim().toLowerCase();
    if (low === "false" || low === "0") return true;
    if (low === "true" || low === "1") return false;
    const n = Number(p);
    return Number.isFinite(n) && n === 0;
  }
  const n = Number(p);
  return Number.isFinite(n) && n === 0;
}

function isSessionPresentTrue(s) {
  if (!s) return false;
  const p = s.Present ?? s.present;
  if (p === true) return true;
  if (p === false || p == null) return false;
  if (typeof p === "string") {
    const low = p.trim().toLowerCase();
    if (low === "true" || low === "1") return true;
    if (low === "false" || low === "0") return false;
  }
  const n = Number(p);
  return Number.isFinite(n) && n === 1;
}

/** Present-weighted hours when available, else from start/end × Present. */
function getSessionDurationHours(s) {
  if (!s) return null;
  const r = s.SessionHoursRow ?? s.sessionHoursRow;
  if (r != null && Number.isFinite(Number(r))) return Number(r);
  const st = s.SessionStartTime ?? s.sessionStartTime;
  const en = s.SessionEndTime ?? s.sessionEndTime;
  if (st && en) {
    const mins = dayjs(en).diff(dayjs(st), "minute");
    if (Number.isFinite(mins) && mins >= 0) {
      const present = Number(s.Present ?? 0);
      const p = Number.isFinite(present) ? present : 0;
      return (mins * p) / 60;
    }
  }
  return null;
}

/** e.g. "2 hours", "3 hours 15 minutes", "45 minutes" */
function formatDurationHuman(hours) {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return "—";
  if (hours < 1 / 120) return "0 minutes";
  const totalMin = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} minute${m === 1 ? "" : "s"}`;
  if (m === 0) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${h} hour${h === 1 ? "" : "s"} ${m} minute${m === 1 ? "" : "s"}`;
}

function CompleteToggle({ completed, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-600">Complete</span>
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label="Mark cell complete"
        disabled={disabled}
        onClick={() => onChange(!completed)}
        className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
          completed ? "border-emerald-500" : "border-slate-300"
        }`}
      >
        <span
          className={`text-[15px] font-bold leading-none ${completed ? "text-emerald-600" : "text-transparent"}`}
          aria-hidden
        >
          ✓
        </span>
      </button>
    </div>
  );
}

function CollapsibleSection({ title, summaryExtra, tint, defaultOpen = true, className = "", children }) {
  const [open, setOpen] = useState(defaultOpen);
  const shell =
    tint === "violet"
      ? "border-violet-200/90 bg-violet-50/40 ring-violet-100/60"
      : "border-teal-200/90 bg-teal-50/40 ring-teal-100/60";
  const dot = tint === "violet" ? "bg-violet-500" : "bg-teal-500";
  const titleTone = tint === "violet" ? "text-violet-900" : "text-teal-900";

  return (
    <section className={`rounded-lg border p-3 ring-1 ${shell} ${className}`.trim()}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-white/50"
      >
        <h3 className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wide ${titleTone}`}>
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
            {title}
          </span>
          {summaryExtra}
        </h3>
        <span
          className={`shrink-0 text-[10px] font-normal text-slate-600 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export default function CellDetailPanel({
  selection,
  onCollapse,
  cellStateKey,
  cellNotes = [],
  cellCompleted = false,
  onCellStateChange,
  forceLoading = false
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [newDraft, setNewDraft] = useState("");

  useEffect(() => {
    setActiveTab("details");
  }, [cellStateKey]);

  useEffect(() => {
    setEditingId(null);
    setEditDraft("");
    setNewDraft("");
    setPendingDeleteNoteId(null);
  }, [cellStateKey]);

  const sortedNotes = useMemo(() => sortNotesForDisplay(cellNotes), [cellNotes]);

  const isZeroHourCell = useMemo(() => {
    const dh = selection?.dayHours;
    return dh !== undefined && dh !== null && Number.isFinite(Number(dh)) && Number(dh) === 0;
  }, [selection?.dayHours]);

  const evaluationsTotalHours = useMemo(
    () => evaluations.reduce((sum, ev) => sum + (getEvaluationDurationHours(ev) ?? 0), 0),
    [evaluations]
  );
  const sessionsTotalHours = useMemo(
    () => sessions.reduce((sum, s) => sum + (getSessionDurationHours(s) ?? 0), 0),
    [sessions]
  );
  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) =>
        toMillis(a.SessionStartTime ?? a.sessionStartTime) - toMillis(b.SessionStartTime ?? b.sessionStartTime)
      ),
    [sessions]
  );
  const sortedEvaluations = useMemo(
    () => [...evaluations].sort((a, b) => toMillis(a.start_time ?? a.StartTime) - toMillis(b.start_time ?? b.StartTime)),
    [evaluations]
  );
  const pendingItems = useMemo(() => {
    const sessionPending = sortedSessions
      .filter((s) => isPendingStatus(getSessionStatus(s)))
      .map((s) => ({
        type: "Session",
        name: getSessionName(s),
        time: getSessionTimeRange(s),
        provider: getSessionProvider(s),
        status: getSessionStatus(s)
      }));
    const evalPending = sortedEvaluations
      .filter((ev) => isPendingStatus(getEvaluationStatus(ev)))
      .map((ev) => ({
        type: "Evaluation",
        name: getEvaluationName(ev),
        time: getEvaluationTimeRange(ev),
        provider: getEvaluationProvider(ev),
        status: getEvaluationStatus(ev)
      }));
    return [...sessionPending, ...evalPending];
  }, [sortedSessions, sortedEvaluations]);

  const pendingDeleteBody = useMemo(() => {
    if (!pendingDeleteNoteId) return "";
    const n = cellNotes.find((x) => x && x.id === pendingDeleteNoteId);
    return n?.body ? String(n.body).replace(/\s+/g, " ").trim() : "";
  }, [pendingDeleteNoteId, cellNotes]);

  useLayoutEffect(() => {
    if (selection?.mrNumber && selection?.date) {
      setLoading(true);
      setError("");
    }
  }, [selection?.mrNumber, selection?.date]);

  useEffect(() => {
    if (!selection?.mrNumber || !selection?.date) {
      setEvaluations([]);
      setSessions([]);
      setError("");
      setLoading(false);
      return;
    }

    const dh = selection.dayHours;
    const skipEvalSessions =
      dh !== undefined && dh !== null && Number.isFinite(Number(dh)) && Number(dh) === 0;

    if (skipEvalSessions) {
      setEvaluations([]);
      setSessions([]);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchCellDetails({
          mrNumber: selection.mrNumber,
          date: selection.date
        });
        if (!cancelled) {
          setEvaluations(Array.isArray(data.evaluations) ? data.evaluations : []);
          setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        }
      } catch (e) {
        if (!cancelled) {
          setEvaluations([]);
          setSessions([]);
          setError(e?.response?.data?.error?.message || "Failed to load cell details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selection?.mrNumber, selection?.date, selection?.dayHours]);

  if (!selection) {
    return (
      <aside className="flex w-full shrink-0 flex-col rounded-xl border border-dashed border-slate-200 bg-white/80 p-5 shadow-sm lg:w-[400px] lg:max-w-[40vw]">
        {onCollapse ? (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={onCollapse}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Collapse
            </button>
          </div>
        ) : null}
        <p className="text-sm leading-relaxed text-slate-600">
          Click a <span className="font-medium text-slate-800">day</span> cell (the colored hours columns) to load
          evaluations and sessions for that row&apos;s MR number and that column&apos;s date.
        </p>
      </aside>
    );
  }

  const titleDate = dayjs(selection.date).isValid()
    ? dayjs(selection.date).format("MMMM D, YYYY")
    : selection.date;

  const canEdit = typeof onCellStateChange === "function";

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={activeTab === id}
      id={`cell-tab-${id}`}
      aria-controls={`cell-tabpanel-${id}`}
      onClick={() => setActiveTab(id)}
      className={`relative shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-1 ${
        activeTab === id
          ? "border-teal-600 text-teal-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <aside className="relative flex max-h-[85vh] w-full shrink-0 flex-col rounded-md border border-slate-200 bg-white shadow-sm lg:w-[320px] lg:max-w-[30vw]">
      <div className="flex shrink-0 flex-col gap-1 border-b border-slate-200 px-2.5 py-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[11px] font-semibold text-slate-800">Selected cell</h2>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              MR <span className="font-medium text-slate-700">{selection.mrNumber || "—"}</span>
              {selection.name ? (
                <>
                  {" "}
                  · <span className="font-medium text-slate-700">{selection.name}</span>
                </>
              ) : null}
            </p>
            <p className="text-[10px] font-medium text-slate-700">{titleDate}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-600">
              {selection.locSummary ? (
                <>
                  · <span className="font-medium text-slate-700">LOC</span> {selection.locSummary}
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {onCollapse ? (
              <button
                type="button"
                onClick={onCollapse}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-100"
              >
                Collapse
              </button>
            ) : null}
            <div className="flex items-center gap-2">
              {canEdit ? (
                <CompleteToggle
                  completed={cellCompleted}
                  disabled={!canEdit}
                  onChange={(next) => {
                    void onCellStateChange({ completed: next }).catch(() => {});
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Cell panel sections">
          {tabBtn("details", "Evaluations & sessions")}
          {tabBtn("notes", "Notes")}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === "notes" && (
          <div
            id="cell-tabpanel-notes"
            role="tabpanel"
            aria-labelledby="cell-tab-notes"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-amber-50/50 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-amber-950">Notes for this cell</h3>
              <span className="text-[11px] font-medium text-amber-900/80">{sortedNotes.length} saved</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
              Notes and Complete are saved on the server for this report range. Each note can be edited or deleted. The
              grid dot shows when at least one note exists.
            </p>

            <ul className="mt-3 space-y-2">
              {sortedNotes.length === 0 ? (
                <li className="rounded-lg border border-dashed border-amber-200/90 bg-white/80 px-3 py-3 text-xs text-amber-900/75">
                  No notes yet — add one below.
                </li>
              ) : (
                sortedNotes.map((note) => {
                  const isEditing = canEdit && editingId === note.id;
                  return (
                    <li
                      key={note.id}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800/90">
                          {formatDt(note.updatedAt || note.createdAt)}
                        </p>
                        {canEdit && !isEditing ? (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              className="rounded px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
                              onClick={() => {
                                setEditingId(note.id);
                                setEditDraft(note.body || "");
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-50"
                              onClick={() => setPendingDeleteNoteId(note.id)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            className="w-full resize-y rounded-md border border-amber-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
                            rows={4}
                            maxLength={CELL_NOTE_BODY_MAX}
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value.slice(0, CELL_NOTE_BODY_MAX))}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-900"
                              onClick={() => {
                                void (async () => {
                                  const body = String(editDraft).trim();
                                  if (!body) return;
                                  const t = Date.now();
                                  try {
                                    await onCellStateChange({
                                      notes: cellNotes.map((n) =>
                                        n.id === note.id ? { ...n, body, updatedAt: t } : n
                                      )
                                    });
                                    setEditingId(null);
                                    setEditDraft("");
                                  } catch {
                                    /* error banner in App */
                                  }
                                })();
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-amber-950 hover:bg-amber-50"
                              onClick={() => {
                                setEditingId(null);
                                setEditDraft("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-snug text-slate-900">
                          {note.body}
                        </p>
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            {canEdit ? (
              <div className="mt-4 rounded-lg border border-amber-300/80 bg-white/90 p-3 shadow-sm">
                <label htmlFor="cell-new-note" className="text-xs font-semibold text-amber-950">
                  New note
                </label>
                <textarea
                  id="cell-new-note"
                  className="mt-1 min-h-[100px] w-full resize-y rounded-md border border-amber-200 bg-white px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
                  rows={4}
                  maxLength={CELL_NOTE_BODY_MAX}
                  placeholder="Write a new note…"
                  value={newDraft}
                  onChange={(e) => setNewDraft(e.target.value.slice(0, CELL_NOTE_BODY_MAX))}
                />
                <p className="mt-1 text-[11px] text-amber-900/70">
                  {newDraft.length}/{CELL_NOTE_BODY_MAX} characters
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-900 disabled:opacity-50"
                  disabled={!String(newDraft).trim()}
                  onClick={() => {
                    void (async () => {
                      const created = createNoteFromBody(newDraft);
                      if (!created) return;
                      try {
                        await onCellStateChange({ notes: [...cellNotes, created] });
                        setNewDraft("");
                      } catch {
                        /* error banner in App */
                      }
                    })();
                  }}
                >
                  Add note
                </button>
              </div>
            ) : (
              <p className="mt-4 text-xs text-amber-900/80">Note editing is not available in this view.</p>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <div
            id="cell-tabpanel-details"
            role="tabpanel"
            aria-labelledby="cell-tab-details"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2.5"
          >
            {!(forceLoading || loading) && error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            {!(forceLoading || loading) && !error && (
              <>
                {isZeroHourCell ? (
                  <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
                    This cell shows <span className="font-medium">0 hours</span>. Evaluations and sessions are not loaded
                    from the server. Notes and Complete still work.
                  </p>
                ) : null}

                {!isZeroHourCell ? (
                  <div className="mb-6 space-y-4">
                    <CollapsibleSection
                      className="mb-0"
                      tint="teal"
                      title={`Sessions (${sortedSessions.length})`}
                      summaryExtra={
                        sortedSessions.length > 0 ? (
                          <span className="font-semibold normal-case text-teal-950">
                            · Total {formatDurationHuman(sessionsTotalHours)}
                          </span>
                        ) : null
                      }
                    >
                      {sortedSessions.length === 0 ? (
                        <p className="text-sm text-teal-900/70">No sessions for this MR and date.</p>
                      ) : (
                        <ul className="space-y-3">
                          {sortedSessions.map((s, idx) => {
                            const sessionHours = getSessionDurationHours(s);
                            const presentTrue = isSessionPresentTrue(s);
                            const presentFalse = isSessionPresentFalse(s);
                            return (
                              <li
                                key={`${s.SessionId}-${s.PatientID}-${s.SessionStartTime ?? "ns"}-${idx}`}
                                className="relative overflow-hidden rounded-xl border border-teal-200 bg-white text-sm text-teal-950 shadow-sm"
                              >
                                {presentTrue ? (
                                  <span
                                    className="pointer-events-none absolute right-2 top-2 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[9px] font-bold leading-none text-emerald-600 shadow ring-1 ring-slate-200"
                                    title="Present: true"
                                    aria-label="Present true"
                                  >
                                    ✓
                                  </span>
                                ) : null}
                                {presentFalse ? (
                                  <span
                                    className="pointer-events-none absolute right-2 top-2 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold leading-none text-white shadow ring-1 ring-white"
                                    title="Present: false"
                                    aria-label="Present false"
                                  >
                                    ×
                                  </span>
                                ) : null}
                                <div className="border-b border-teal-100 bg-gradient-to-b from-teal-100 to-teal-50/90 px-3 py-2.5 text-center">
                                  <div className="text-sm font-semibold leading-tight text-center text-teal-900">
                                    {formatDurationHuman(sessionHours)}
                                  </div>
                                </div>
                                <div className="px-3 py-2.5">
                                  <div className="text-xs text-teal-900/85">Name: {getSessionName(s)}</div>
                                  <div className="mt-1 text-xs text-teal-900/85">Time: {getSessionTimeRange(s)}</div>
                                  <div className="text-xs text-teal-900/85">Provider: {getSessionProvider(s)}</div>
                                  <div className="text-xs text-teal-900/85">Status: {getSessionStatus(s)}</div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CollapsibleSection>

                    <CollapsibleSection
                      tint="violet"
                      title={`Evaluations (${sortedEvaluations.length})`}
                      summaryExtra={
                        sortedEvaluations.length > 0 ? (
                          <span className="font-semibold normal-case text-violet-950">
                            · Total {formatDurationHuman(evaluationsTotalHours)}
                          </span>
                        ) : null
                      }
                    >
                      {sortedEvaluations.length === 0 ? (
                        <p className="text-sm text-violet-900/70">No evaluations for this MR and date.</p>
                      ) : (
                        <ul className="space-y-3">
                          {sortedEvaluations.map((ev, idx) => {
                            const evaluationHours = getEvaluationDurationHours(ev);
                            return (
                              <li
                                key={`${ev.PatientId ?? ev.patientId ?? "p"}-${String(ev.start_time)}-${idx}`}
                                className="overflow-hidden rounded-xl border border-violet-200 bg-white text-sm text-violet-950 shadow-sm"
                              >
                                <div className="border-b border-violet-100 bg-gradient-to-b from-violet-100 to-violet-50/90 px-3 py-2.5 text-center">
                                  <div className="text-sm font-semibold leading-tight text-center text-violet-900">
                                    {formatDurationHuman(evaluationHours)}
                                  </div>
                                </div>
                                <div className="px-3 py-2.5">
                                  <div className="text-xs text-violet-900/85">Evaluation: {getEvaluationName(ev)}</div>
                                  <div className="mt-1 text-xs text-violet-900/85">Time: {getEvaluationTimeRange(ev)}</div>
                                  <div className="text-xs text-violet-900/85">Provider: {getEvaluationProvider(ev)}</div>
                                  <div className="text-xs text-violet-900/85">Status: {getEvaluationStatus(ev)}</div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CollapsibleSection>

                    <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 ring-1 ring-amber-100/60">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                        Pending items ({pendingItems.length})
                      </h3>
                      {pendingItems.length === 0 ? (
                        <p className="mt-2 text-sm text-amber-900/70">No pending sessions or evaluations.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {pendingItems.map((item, idx) => (
                            <li key={`${item.type}-${item.name}-${item.time}-${idx}`} className="rounded-md border border-amber-200 bg-white px-2.5 py-2">
                              <div className="text-xs font-semibold text-amber-900">{item.type}: {item.name}</div>
                              <div className="text-xs text-amber-900/85">Time: {item.time}</div>
                              <div className="text-xs text-amber-900/85">Provider: {item.provider}</div>
                              <div className="text-xs text-amber-900/85">Status: {item.status}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
      {(forceLoading || loading) && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-slate-50/65 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-2.5">
            <div
              className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500"
              style={{ animationDuration: "0.75s" }}
              aria-hidden
            />
            <p className="text-[11px] font-medium tracking-wide text-slate-600">Loading...</p>
          </div>
        </div>
      )}
    </aside>

      {pendingDeleteNoteId ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-note-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setPendingDeleteNoteId(null)}
            aria-label="Close dialog"
          />
          <div className="relative z-[1] w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 id="delete-note-dialog-title" className="text-base font-semibold text-slate-900">
              Delete this note?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Are you sure you want to delete this note?
            </p>
            {pendingDeleteBody ? (
              <p className="mt-3 max-h-24 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {truncate(pendingDeleteBody, 400)}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteNoteId(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = pendingDeleteNoteId;
                  if (!id || typeof onCellStateChange !== "function") return;
                  void (async () => {
                    try {
                      const t = Date.now();
                      await onCellStateChange({
                        notes: cellNotes.map((n) =>
                          n.id === id ? { ...n, deleted: true, deletedAt: t, updatedAt: t } : n
                        )
                      });
                      if (editingId === id) {
                        setEditingId(null);
                        setEditDraft("");
                      }
                      setPendingDeleteNoteId(null);
                    } catch {
                      /* error banner in App */
                    }
                  })();
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
