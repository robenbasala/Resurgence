import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(year, month) {
  return year * 12 + (month - 1);
}

function keyToYm(key) {
  const y = Math.floor(key / 12);
  const m = (key % 12) + 1;
  return { year: y, month: m };
}

function formatRangeLabel(fromYear, fromMonth, toYear, toMonth) {
  const a = dayjs(`${fromYear}-${String(fromMonth).padStart(2, "0")}-01`);
  const b = dayjs(`${toYear}-${String(toMonth).padStart(2, "0")}-01`);
  return `${a.format("MMM YYYY")} - ${b.format("MMM YYYY")}`;
}

function isInRange(y, m, fy, fm, ty, tm) {
  const k = monthKey(y, m);
  return k >= monthKey(fy, fm) && k <= monthKey(ty, tm);
}

function pastMonthsRange(monthsBack) {
  const end = dayjs().startOf("month");
  const start = end.subtract(monthsBack - 1, "month");
  return {
    fromYear: start.year(),
    fromMonth: start.month() + 1,
    toYear: end.year(),
    toMonth: end.month() + 1
  };
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function MonthRangePicker({ value, onApply, onClear, years, disabled }) {
  const [open, setOpen] = useState(false);
  const [leftYear, setLeftYear] = useState(dayjs().year() - 1);
  const [draft, setDraft] = useState(value);
  const [anchorKey, setAnchorKey] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setAnchorKey(null);
    setLeftYear(dayjs().year() - 1);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const yearList = years.length ? years : [dayjs().year()];
  const minY = Math.min(...yearList);

  const handleMonthClick = (year, month) => {
    const k = monthKey(year, month);
    if (anchorKey === null) {
      const ym = keyToYm(k);
      setDraft({ fromYear: ym.year, fromMonth: ym.month, toYear: ym.year, toMonth: ym.month });
      setAnchorKey(k);
      return;
    }
    const fromK = Math.min(anchorKey, k);
    const toK = Math.max(anchorKey, k);
    const from = keyToYm(fromK);
    const to = keyToYm(toK);
    setDraft({
      fromYear: from.year,
      fromMonth: from.month,
      toYear: to.year,
      toMonth: to.month
    });
    setAnchorKey(null);
  };

  const handleQuick = (n) => {
    const r = pastMonthsRange(n);
    setDraft(r);
    setAnchorKey(null);
    setLeftYear(Math.min(r.fromYear, r.toYear));
  };

  const handleApply = () => {
    onApply(draft);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setAnchorKey(null);
    setOpen(false);
  };

  const shiftYears = (delta) => {
    setLeftYear((y) => y + delta);
  };

  const renderYearGrid = (year) => (
    <div className="w-full min-w-0 shrink-0">
      <div className="mb-2 text-center text-[1.1em] font-bold text-slate-800">{year}</div>
      <div className="grid w-full grid-cols-3 gap-2">
        {MONTH_SHORT.map((label, idx) => {
          const m = idx + 1;
          const selected = isInRange(year, m, draft.fromYear, draft.fromMonth, draft.toYear, draft.toMonth);
          const dimmed = false;
          return (
            <button
              key={`${year}-${m}`}
              type="button"
              disabled={disabled || dimmed}
              onClick={() => handleMonthClick(year, m)}
              className={[
                "rounded-lg p-2 font-medium leading-tight shadow-sm transition-all duration-200 hover:shadow-md",
                dimmed && "cursor-not-allowed opacity-30",
                !dimmed && selected && "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600",
                !dimmed && !selected && "bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const summary = formatRangeLabel(draft.fromYear, draft.fromMonth, draft.toYear, draft.toMonth);
  const displayLabel = formatRangeLabel(value.fromYear, value.fromMonth, value.toYear, value.toMonth);

  const toggleOpen = () => setOpen((o) => !o);

  return (
    <div ref={rootRef} className="relative flex w-full min-w-0 items-center gap-2 text-sm text-slate-800">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-none border-0 bg-transparent py-0 text-left font-normal text-slate-800 hover:bg-transparent disabled:opacity-50"
      >
        <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className="min-w-0 flex-1 truncate font-normal">{displayLabel}</span>
      </button>
      {typeof onClear === "function" && (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
          className="shrink-0 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-40"
        >
          Clear
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        aria-label={open ? "Close calendar" : "Open calendar"}
      >
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[200] mt-1.5 w-[min(28rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] rounded-xl border border-emerald-200 bg-white/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="mb-2 flex flex-nowrap items-center justify-between gap-1 border-b border-emerald-100 pb-2">
            {[3, 6, 9, 12].map((n) => (
              <button
                key={n}
                type="button"
                className="whitespace-nowrap rounded-md bg-gradient-to-r from-emerald-100 to-green-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-900 shadow-sm transition-all duration-200 hover:from-emerald-200 hover:to-green-200 hover:shadow-md"
                onClick={() => handleQuick(n)}
              >
                Past {n} Months
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2">
            <button
              type="button"
              className="mt-0 shrink-0 rounded-lg p-0 text-[2.5em] leading-none text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
              onClick={() => shiftYears(-1)}
              aria-label="Previous years"
            >
              <span className="leading-none">‹</span>
            </button>

            <div className="relative grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
              {renderYearGrid(leftYear)}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[1.86rem] hidden h-[9.9rem] w-px -translate-x-1/2 bg-emerald-200 sm:block"
              />
              {renderYearGrid(leftYear + 1)}
            </div>

            <button
              type="button"
              className="mt-0 shrink-0 rounded-lg p-0 text-[2.5em] leading-none text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
              onClick={() => shiftYears(1)}
              aria-label="Next years"
            >
              <span className="leading-none">›</span>
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-2 text-center">
            <p className="mb-0.5 text-slate-600">Selected Range</p>
            <p className="font-bold text-emerald-900">{summary}</p>
          </div>

          <div className="mt-3 flex justify-end gap-2 border-t border-emerald-100 pt-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1.5 font-semibold text-white shadow-md transition hover:from-emerald-600 hover:to-green-600 hover:shadow-lg"
              onClick={handleApply}
            >
              Apply Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
