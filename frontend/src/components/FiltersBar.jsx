import { useEffect, useMemo, useRef, useState } from "react";
import MonthRangePicker from "./MonthRangePicker";

function FilterFieldBox({ children, className = "" }) {
  return (
    <div
      className={`flex h-9 min-w-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 shadow-none ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function ChevronDown({ className = "h-4 w-4 text-slate-400" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FieldClearX({ onClick, disabled, label }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 px-0.5 text-base font-medium leading-none text-red-500 hover:text-red-600 disabled:opacity-40"
      title={label}
      aria-label={label}
    >
      ×
    </button>
  );
}

const inputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-0 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0";

function FacilityMultiSelect({ value, options, onChange, disabled }) {
  const selected = Array.isArray(value) ? value : [];
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onDocKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    const query = String(search || "").trim().toLowerCase();
    if (!query) return options;
    return options.filter((opt) => String(opt.label || "").toLowerCase().includes(query));
  }, [options, search]);

  const titleLabel =
    selected.length === 0
      ? "All Facilities"
      : selected.length === 1
        ? options.find((opt) => opt.id === selected[0])?.label || "1 facility"
        : `${selected.length} facilities selected`;

  const toggleOption = (id) => {
    if (disabled) return;
    const exists = selected.includes(id);
    if (exists) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-2.5 text-left text-sm text-slate-800 disabled:opacity-50"
      >
        <span className="truncate">{titleLabel}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[250] mt-1.5 w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border border-violet-200 bg-white p-3 shadow-2xl">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facility names..."
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-300 focus:bg-white"
          />

          <div className="mt-2 max-h-64 overflow-y-auto pr-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-sm text-slate-500">No facilities found.</p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selected.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-800 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={checked}
                      onChange={() => toggleOption(option.id)}
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                );
              })
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-xs text-slate-500">{selected.length} selected</span>
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled || selected.length === 0}
              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FiltersBar({
  filters,
  years,
  onChange,
  onMonthRangeApply,
  onClearMonthRange,
  onGenerate,
  onExport,
  viewMode,
  onToggleViewMode,
  loading
}) {
  const facilityOptions = [
    { id: "65", label: "RCA Mental Health" },
    { id: "66", label: "RCA Inpatient Mental Health" },
    { id: "67,69", label: "Riverside" },
    { id: "71", label: "RCA Outpatient" },
    { id: "42", label: "Milton" },
    { id: "43", label: "Muse Outpatient" }
  ];

  return (
    <div className="overflow-visible rounded-md border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-1 gap-2 overflow-visible md:grid-cols-2 md:gap-x-2 md:gap-y-2 lg:inline-grid lg:w-full lg:max-w-full lg:grid-cols-[minmax(17rem,22rem)_minmax(10rem,12rem)_minmax(10rem,12rem)_minmax(10rem,12rem)_auto_auto_auto] lg:items-stretch lg:justify-items-stretch">
        <div className="relative z-[200] min-w-0 md:col-span-2 lg:col-span-1">
          <FilterFieldBox className="w-full min-w-0">
            <div className="min-w-0 flex-1">
              <MonthRangePicker
                value={{
                  fromYear: filters.fromYear,
                  fromMonth: filters.fromMonth,
                  toYear: filters.toYear,
                  toMonth: filters.toMonth
                }}
                onApply={onMonthRangeApply}
                onClear={onClearMonthRange}
                years={years}
                disabled={loading}
              />
            </div>
          </FilterFieldBox>
        </div>

        <FilterFieldBox className="min-w-0">
          <input
            className={inputInnerClass}
            placeholder="Search Name"
            title="Live filter"
            value={filters.name}
            onChange={(e) => onChange("name", e.target.value)}
            disabled={loading}
          />
          {Boolean(filters.name) && (
            <FieldClearX disabled={loading} label="Clear name" onClick={() => onChange("name", "")} />
          )}
          <ChevronDown />
        </FilterFieldBox>

        <FacilityMultiSelect
          value={filters.facility}
          options={facilityOptions}
          onChange={(next) => onChange("facility", next)}
          disabled={loading}
        />

        <FilterFieldBox className="min-w-0">
          <input
            className={inputInnerClass}
            placeholder="Search MR Number"
            title="Live filter"
            value={filters.mrNumber}
            onChange={(e) => onChange("mrNumber", e.target.value)}
            disabled={loading}
          />
          {Boolean(filters.mrNumber) && (
            <FieldClearX disabled={loading} label="Clear MR number" onClick={() => onChange("mrNumber", "")} />
          )}
          <ChevronDown />
        </FilterFieldBox>

        <button
          type="button"
          className="flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={onGenerate}
          disabled={loading}
        >
          Generate Report
        </button>

        <button
          type="button"
          className="flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-emerald-600 bg-white px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          onClick={onExport}
          disabled={loading}
        >
          Export CSV
        </button>

        <button
          type="button"
          className="flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          onClick={onToggleViewMode}
          disabled={loading}
          title="Switch between standard and virtualized row rendering"
        >
          {viewMode === "virtualized" ? "Mode: Virtualized" : "Mode: Standard"}
        </button>
      </div>
    </div>
  );
}
