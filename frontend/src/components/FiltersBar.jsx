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
    "",
    "RCA Mental Health",
    "Riverside",
    "RCA Outpatient",
    "Milton",
    "MUSE Outpatient"
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

        <FilterFieldBox className="min-w-0">
          <select
            className={inputInnerClass}
            title="Live facility filter"
            value={filters.facility}
            onChange={(e) => onChange("facility", e.target.value)}
            disabled={loading}
          >
            <option value="">All Facilities</option>
            {facilityOptions
              .filter(Boolean)
              .map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </select>
          <ChevronDown />
        </FilterFieldBox>

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
