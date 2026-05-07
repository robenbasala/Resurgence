import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import FiltersBar from "./components/FiltersBar";
import ReportTable from "./components/ReportTable";
import CellDetailPanel from "./components/CellDetailPanel";
import { fetchCellAnnotations, fetchReport, fetchReportMeta, saveCellAnnotation } from "./api/reportApi";
import { exportReportToCsv } from "./utils/csv";
import { buildCellStateKey, getCellStateEntry, normalizeCellState } from "./utils/cellStateStorage";

const initialNow = dayjs();

const defaultFilters = {
  fromYear: initialNow.year(),
  fromMonth: initialNow.month() + 1,
  toYear: initialNow.year(),
  toMonth: initialNow.month() + 1,
  name: "",
  mrNumber: "",
  facility: ""
};
const LOAD_ANNOTATIONS_ON_GENERATE = false;

function normalizeYears(yearsFromApi) {
  const years = Array.isArray(yearsFromApi) ? yearsFromApi : [];
  const merged = new Set([2025, ...years, defaultFilters.fromYear]);
  return Array.from(merged).sort((a, b) => b - a);
}

function normalizeString(value) {
  return String(value || "").trim().toLowerCase();
}

function getFacilityCandidates(row) {
  const mr = String(row?.mrNumber || "").toUpperCase();
  const loc = normalizeString(row?.locSummary);
  const facilities = new Set();

  if (mr.startsWith("MH")) {
    facilities.add("RCA Mental Health");
  }

  if (mr.startsWith("2026")) {
    // RBH mapping default
    facilities.add("Riverside");
    // A New Start mapping hint from location text
    if (loc.includes("milton") || loc.includes("muse")) {
      facilities.add("Milton");
    }
  }

  if (mr.startsWith("OP")) {
    // RBH mapping default
    facilities.add("RCA Outpatient");
    // A New Start mapping hint from location text
    if (loc.includes("milton") || loc.includes("muse")) {
      facilities.add("MUSE Outpatient");
    }
  }

  return facilities;
}

function filterReportRowsClient(report, filters) {
  const nameQ = normalizeString(filters?.name);
  const mrQ = normalizeString(filters?.mrNumber);
  const facilityQ = String(filters?.facility || "").trim();

  const rows = (report?.rows || []).filter((row) => {
    const matchesName = !nameQ || normalizeString(row?.name).includes(nameQ);
    const matchesMr = !mrQ || normalizeString(row?.mrNumber).includes(mrQ);

    if (!facilityQ) {
      return matchesName && matchesMr;
    }

    const facilityCandidates = getFacilityCandidates(row);
    const matchesFacility = facilityCandidates.has(facilityQ);
    return matchesName && matchesMr && matchesFacility;
  });

  return { ...(report || {}), rows };
}

export default function App() {
  const [filters, setFilters] = useState(defaultFilters);
  const [years, setYears] = useState(() => normalizeYears([]));
  const [report, setReport] = useState({
    fromYear: defaultFilters.fromYear,
    fromMonth: defaultFilters.fromMonth,
    toYear: defaultFilters.toYear,
    toMonth: defaultFilters.toMonth,
    days: [],
    rows: []
  });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("virtualized");
  const [cellSelection, setCellSelection] = useState(null);
  const [cellPanelOpen, setCellPanelOpen] = useState(true);
  const [cellInstantLoading, setCellInstantLoading] = useState(false);
  const [cellAnnotations, setCellAnnotations] = useState({});
  const [annotationError, setAnnotationError] = useState("");
  const cellAnnotationsRef = useRef(cellAnnotations);

  useEffect(() => {
    cellAnnotationsRef.current = cellAnnotations;
  }, [cellAnnotations]);

  const onDayCellPointerDown = useCallback(() => {
    setCellPanelOpen(true);
    setCellInstantLoading(true);
  }, []);

  const onDayCellClick = useCallback((payload) => {
    const h = payload?.dayHours;
    const isZero =
      h !== undefined && h !== null && Number.isFinite(Number(h)) && Number(h) === 0;
    setCellSelection(payload);
    if (isZero) {
      setCellPanelOpen(false);
    } else {
      setCellPanelOpen(true);
    }
    setTimeout(() => setCellInstantLoading(false), 180);
  }, []);

  const selectionStorageKey = useMemo(() => {
    if (!cellSelection?.mrNumber || !cellSelection?.date) return null;
    return buildCellStateKey({
      mrNumber: cellSelection.mrNumber,
      date: cellSelection.date,
      authStart: cellSelection.authStart,
      authEnd: cellSelection.authEnd,
      authorizationNumber: cellSelection.authorizationNumber,
      locSummary: cellSelection.locSummary,
      patientId: cellSelection.patientId
    });
  }, [cellSelection]);

  const selectionAnnotation = useMemo(() => {
    if (!selectionStorageKey) return { completed: false, notes: [] };
    return getCellStateEntry(cellAnnotations, selectionStorageKey) || { completed: false, notes: [] };
  }, [cellAnnotations, selectionStorageKey]);

  const onCellStateChange = useCallback(
    async (patch) => {
      if (!selectionStorageKey || !cellSelection) return;
      setAnnotationError("");
      const prev = cellAnnotationsRef.current;
      const cur = getCellStateEntry(prev, selectionStorageKey) || { completed: false, notes: [] };
      const nextEntry = normalizeCellState({
        completed: patch.completed !== undefined ? Boolean(patch.completed) : cur.completed,
        notes: patch.notes !== undefined ? patch.notes : cur.notes
      });
      try {
        await saveCellAnnotation({
          cellKey: selectionStorageKey,
          mrNumber: cellSelection.mrNumber,
          cellDate: cellSelection.date,
          authStart: cellSelection.authStart || null,
          authEnd: cellSelection.authEnd || null,
          authorizationNumber: cellSelection.authorizationNumber || null,
          locSummary: cellSelection.locSummary || null,
          patientId: cellSelection.patientId != null ? String(cellSelection.patientId) : null,
          completed: nextEntry.completed,
          notes: nextEntry.notes
        });
        setCellAnnotations((p) => ({ ...p, [selectionStorageKey]: nextEntry }));
      } catch (e) {
        const apiMsg = e?.response?.data?.error?.message;
        setAnnotationError(apiMsg || e?.message || "Failed to save cell.");
        throw e;
      }
    },
    [selectionStorageKey, cellSelection]
  );

  useEffect(() => {
    async function loadMeta() {
      try {
        const data = await fetchReportMeta();
        const safeYears = normalizeYears(data.years);
        if (safeYears.length > 0) {
          setYears(safeYears);
          setFilters((prev) => ({
            ...prev,
            fromYear: safeYears.includes(prev.fromYear) ? prev.fromYear : safeYears[0],
            toYear: safeYears.includes(prev.toYear) ? prev.toYear : safeYears[0]
          }));
        }
      } catch (e) {
        setYears(normalizeYears([]));
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    if (!appliedFilters) return;

    async function loadReport() {
      setLoading(true);
      setError("");
      setAnnotationError("");
      setCellAnnotations({});
      try {
        const data = await fetchReport(appliedFilters);
        setReport(data);
        if (LOAD_ANNOTATIONS_ON_GENERATE) {
          void (async () => {
            try {
              const ann = await fetchCellAnnotations(appliedFilters);
              const map = ann?.annotations && typeof ann.annotations === "object" ? ann.annotations : {};
              setCellAnnotations(map);
            } catch (annErr) {
              const apiMsg = annErr?.response?.data?.error?.message;
              setAnnotationError(
                apiMsg ||
                  annErr?.message ||
                  "Could not load saved cell notes from the server. Complete and notes may be out of date until you reload."
              );
              setCellAnnotations({});
            }
          })();
        }
      } catch (e) {
        const apiMsg = e?.response?.data?.error?.message;
        const netMsg = e?.message;
        setError(
          apiMsg ||
            (netMsg && netMsg !== "Network Error" ? netMsg : null) ||
            (e?.code === "ERR_NETWORK" || e?.message === "Network Error"
              ? "Cannot reach the API server. Is the backend running and VITE_API_BASE_URL correct?"
              : null) ||
            "Failed to load report data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [appliedFilters]);

  const onChangeFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const onMonthRangeApply = (range) => {
    setFilters((prev) => ({
      ...prev,
      fromYear: range.fromYear,
      fromMonth: range.fromMonth,
      toYear: range.toYear,
      toMonth: range.toMonth
    }));
  };

  const onClearMonthRange = () => {
    const now = dayjs();
    setFilters((prev) => ({
      ...prev,
      fromYear: now.year(),
      fromMonth: now.month() + 1,
      toYear: now.year(),
      toMonth: now.month() + 1
    }));
  };

  const onGenerate = () => {
    setHasGenerated(true);
    const startValue = dayjs(`${filters.fromYear}-${String(filters.fromMonth).padStart(2, "0")}-01`);
    const endValue = dayjs(`${filters.toYear}-${String(filters.toMonth).padStart(2, "0")}-01`);
    const normalizedFrom = startValue.isAfter(endValue, "month")
      ? { year: filters.toYear, month: filters.toMonth }
      : { year: filters.fromYear, month: filters.fromMonth };
    const normalizedTo = startValue.isAfter(endValue, "month")
      ? { year: filters.fromYear, month: filters.fromMonth }
      : { year: filters.toYear, month: filters.toMonth };

    setCellSelection(null);
    setCellPanelOpen(true);
    setAppliedFilters({
      fromYear: normalizedFrom.year,
      fromMonth: normalizedFrom.month,
      toYear: normalizedTo.year,
      toMonth: normalizedTo.month,
      name: "",
      mrNumber: ""
    });
  };

  const displayReport = useMemo(() => filterReportRowsClient(report, filters), [report, filters]);

  const onExport = () => {
    if (displayReport.rows.length === 0) return;
    exportReportToCsv(displayReport);
  };

  const onToggleViewMode = () => {
    setViewMode((prev) => (prev === "virtualized" ? "standard" : "virtualized"));
  };

  return (
    <main className="min-h-screen overflow-x-visible bg-slate-50 p-1.5 md:p-2">
      <div className="w-full space-y-2 overflow-x-visible">
        <header className="rounded-md border border-slate-200 bg-white p-2.5 shadow-sm">
          <h1 className="text-base font-semibold text-slate-800 md:text-lg">
            Monthly Session Hours Report
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Attendance/treatment calendar matrix grouped by MR Number.
          </p>
        </header>

        <FiltersBar
          filters={filters}
          years={years}
          onChange={onChangeFilter}
          onMonthRangeApply={onMonthRangeApply}
          onClearMonthRange={onClearMonthRange}
          onGenerate={onGenerate}
          onExport={onExport}
          viewMode={viewMode}
          onToggleViewMode={onToggleViewMode}
          loading={loading}
        />

        {annotationError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            {annotationError}
          </div>
        )}

        {loading && (
          <div
            className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-slate-200/80 bg-white/80 py-16 shadow-[0_8px_30px_-12px_rgba(15,118,110,0.12)] backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <div className="relative grid h-14 w-14 place-items-center" aria-hidden>
              <div className="pointer-events-none absolute inset-[-40%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(45,212,191,0.22),transparent_68%)]" />
              <div
                className="relative h-full w-full animate-spin rounded-full p-[2.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] [background:conic-gradient(from_0deg,#f8fafc_0%,#99f6e4_14%,#2dd4bf_32%,#0d9488_52%,#5eead4_68%,#f1f5f9_88%,#f8fafc_100%)]"
                style={{ animationDuration: "0.9s" }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-white to-slate-50/95 shadow-[inset_0_1px_8px_rgba(255,255,255,1)] ring-1 ring-slate-200/50">
                  <span className="h-1 w-1 rounded-full bg-slate-300/70" />
                </div>
              </div>
            </div>
            <p className="text-[13px] font-medium tracking-wide text-slate-500">Loading report…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && hasGenerated && displayReport.rows.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No rows found for the selected filters.
          </div>
        )}

        {!loading && !error && hasGenerated && displayReport.rows.length > 0 && (
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <ReportTable
                report={displayReport}
                virtualized={viewMode === "virtualized"}
                onDayCellPointerDown={onDayCellPointerDown}
                onDayCellClick={onDayCellClick}
                cellAnnotations={cellAnnotations}
              />
            </div>
            {cellPanelOpen ? (
              <CellDetailPanel
                selection={cellSelection}
                onCollapse={() => setCellPanelOpen(false)}
                cellStateKey={selectionStorageKey}
                cellNotes={selectionAnnotation.notes}
                cellCompleted={selectionAnnotation.completed}
                onCellStateChange={onCellStateChange}
                forceLoading={cellInstantLoading}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCellPanelOpen(true)}
                className="flex min-h-[200px] w-full shrink-0 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 lg:sticky lg:top-4 lg:min-h-[min(70vh,560px)] lg:w-11 lg:flex-col lg:px-1 lg:py-6"
                aria-label="Open cell details panel"
              >
                <span className="hidden text-slate-500 lg:inline" style={{ writingMode: "vertical-rl" }} aria-hidden>
                  Cell
                </span>
                <span className="lg:hidden">Open cell panel</span>
                <span className="text-lg text-slate-400" aria-hidden>
                  ◀
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
