import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import FiltersBar from "./components/FiltersBar";
import ReportTable from "./components/ReportTable";
import { fetchReport, fetchReportMeta } from "./api/reportApi";
import { exportReportToCsv } from "./utils/csv";

const initialNow = dayjs();

const defaultFilters = {
  fromYear: initialNow.year(),
  fromMonth: initialNow.month() + 1,
  toYear: initialNow.year(),
  toMonth: initialNow.month() + 1,
  name: "",
  mrNumber: ""
};

function normalizeYears(yearsFromApi) {
  const years = Array.isArray(yearsFromApi) ? yearsFromApi : [];
  const merged = new Set([2025, ...years, defaultFilters.fromYear]);
  return Array.from(merged).sort((a, b) => b - a);
}

function filterReportRowsClient(report, nameQuery, mrQuery) {
  const nameQ = String(nameQuery || "").trim().toLowerCase();
  const mrQ = String(mrQuery || "").trim().toLowerCase();
  if (!nameQ && !mrQ) return report;
  const rows = report.rows.filter((row) => {
    const matchMr = !mrQ || String(row.mrNumber || "").toLowerCase().includes(mrQ);
    const matchName = !nameQ || String(row.name || "").toLowerCase().includes(nameQ);
    return matchMr && matchName;
  });
  return { ...report, rows };
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
      try {
        const data = await fetchReport(appliedFilters);
        setReport(data);
      } catch (e) {
        setError(e?.response?.data?.error?.message || "Failed to load report data.");
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

    setAppliedFilters({
      fromYear: normalizedFrom.year,
      fromMonth: normalizedFrom.month,
      toYear: normalizedTo.year,
      toMonth: normalizedTo.month,
      name: String(filters.name || "").trim(),
      mrNumber: String(filters.mrNumber || "").trim()
    });
  };

  /** Name / MR: filter loaded report while typing. Generate still queries SQL with name + mrNumber. */
  const displayReport = useMemo(
    () => filterReportRowsClient(report, filters.name, filters.mrNumber),
    [report, filters.name, filters.mrNumber]
  );

  const onExport = () => {
    if (displayReport.rows.length === 0) return;
    exportReportToCsv(displayReport);
  };

  const onToggleViewMode = () => {
    setViewMode((prev) => (prev === "virtualized" ? "standard" : "virtualized"));
  };

  return (
    <main className="min-h-screen overflow-x-visible bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1800px] space-y-4 overflow-x-visible">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
            Monthly Session Hours Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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

        {!loading && !error && hasGenerated && report.rows.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No rows found for the selected filters.
          </div>
        )}

        {!loading &&
          !error &&
          hasGenerated &&
          report.rows.length > 0 &&
          displayReport.rows.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No rows match the current Name / MR Number on the loaded report. Clear those fields or click Generate to
              query the database again.
            </div>
          )}

        {!loading && !error && hasGenerated && displayReport.rows.length > 0 && (
          <ReportTable report={displayReport} virtualized={viewMode === "virtualized"} />
        )}
      </div>
    </main>
  );
}
