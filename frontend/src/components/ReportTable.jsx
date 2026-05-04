import { useMemo, useRef, useCallback } from "react";
import dayjs from "dayjs";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getCellStyle } from "../utils/reportCell";
import { buildCellStateKey, cellHasNotes, getCellStateEntry } from "../utils/cellStateStorage";

const FIXED_COLUMNS = [
  { key: "mrNumber", label: "MR Number", width: 130 },
  { key: "name", label: "Name", width: 190 },
  { key: "admit", label: "Admit", width: 110 },
  { key: "discharge", label: "Discharge", width: 110 },
  { key: "auth", label: "Auth Range", width: 160 },
  { key: "locSummary", label: "LOC Summary", width: 130 }
];

const LEFT_OFFSETS = FIXED_COLUMNS.reduce((acc, col, index) => {
  const prev = index === 0 ? 0 : acc[index - 1] + FIXED_COLUMNS[index - 1].width;
  acc[index] = prev;
  return acc;
}, []);

function renderFixedCell(row, col) {
  if (col.key === "auth") {
    return `${row.authStart || "-"} - ${row.authEnd || "-"}`;
  }
  return row[col.key] || "-";
}

function isSamePatientGroup(a, b) {
  if (!a || !b) return false;
  return (
    a.mrNumber === b.mrNumber &&
    a.name === b.name &&
    a.admit === b.admit &&
    a.discharge === b.discharge
  );
}

function buildRowSpanMeta(rows) {
  const spansByStartIndex = {};
  const startByRowIndex = {};

  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && isSamePatientGroup(rows[i], rows[j])) {
      j += 1;
    }

    spansByStartIndex[i] = j - i;
    for (let k = i; k < j; k += 1) {
      startByRowIndex[k] = i;
    }
    i = j;
  }

  return { spansByStartIndex, startByRowIndex };
}

function formatHours(value) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2).replace(/\.?0+$/, "") : "0";
}

function activeNotesForPreview(ann) {
  if (!ann?.notes?.length) return [];
  return ann.notes.filter((n) => n && !n.deleted && String(n.body || "").trim());
}

export default function ReportTable({ report, virtualized = true, onDayCellClick, cellAnnotations = {} }) {
  const scrollRef = useRef(null);
  const interactiveDayCells = typeof onDayCellClick === "function";
  const handleDayCellActivate = useCallback(
    (row, dayKey) => {
      if (!interactiveDayCells) return;
      const entry = row.dailyEntries?.[dayKey];
      const dayHours = Number(entry?.hours ?? 0);
      onDayCellClick({
        mrNumber: row.mrNumber,
        date: dayKey,
        name: row.name,
        patientId: row.patientId,
        authStart: row.authStart,
        authEnd: row.authEnd,
        authorizationNumber: row.authorizationNumber,
        locSummary: row.locSummary,
        rowGroupKey: row.rowGroupKey,
        dayHours
      });
    },
    [interactiveDayCells, onDayCellClick]
  );
  const dayHeaders = useMemo(
    () => report.days.map((day) => ({ key: day, label: dayjs(day).format("M/D") })),
    [report.days]
  );
  const rowVirtualizer = useVirtualizer({
    count: report.rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 12,
    enabled: virtualized
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const fixedTotalWidth = FIXED_COLUMNS.reduce((sum, col) => sum + col.width, 0);
  /** Same pixel width for header + body day columns (flex + table-fixed). */
  const dayColumnWidth = 72;
  const gridMinWidth = fixedTotalWidth + dayHeaders.length * dayColumnWidth;

  const dayHeaderCellClass =
    "shrink-0 border border-slate-200 bg-slate-100 px-2 py-2 text-center text-sm font-semibold text-slate-700 box-border";
  const dayBodyCellClass = `shrink-0 box-border border border-slate-200 px-2 py-2 text-center text-sm font-medium align-middle${
    interactiveDayCells ? " cursor-pointer select-none hover:brightness-[0.97]" : ""
  }`;
  const dayBodyInnerClass =
    "relative flex min-h-[2.75rem] w-full flex-col items-center justify-center text-center";
  const dayColStyleFlex = {
    width: dayColumnWidth,
    minWidth: dayColumnWidth,
    maxWidth: dayColumnWidth,
    flex: "0 0 auto",
    boxSizing: "border-box"
  };
  const dayColStyleTable = {
    width: dayColumnWidth,
    minWidth: dayColumnWidth,
    maxWidth: dayColumnWidth,
    boxSizing: "border-box"
  };

  const headerClass =
    "border border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-700";
  const cellClass = "border border-slate-200 px-3 py-2 text-slate-700";

  const rowSpanMeta = useMemo(() => buildRowSpanMeta(report.rows), [report.rows]);
  const hasMergedGroups = useMemo(
    () => Object.values(rowSpanMeta.spansByStartIndex).some((span) => span > 1),
    [rowSpanMeta]
  );
  const effectiveVirtualized = virtualized && !hasMergedGroups;

  const renderDayCellDiv = (row, dayKey) => {
    const entry = row.dailyEntries?.[dayKey];
    const hours = Number(entry?.hours ?? 0);
    const loc = entry?.loc || "";
    const style = getCellStyle({
      cellDate: dayKey,
      hours,
      admit: row.admit,
      discharge: row.discharge,
      loc
    });
    const cellKey = buildCellStateKey({
      mrNumber: row.mrNumber,
      date: dayKey,
      authStart: row.authStart,
      authEnd: row.authEnd,
      authorizationNumber: row.authorizationNumber,
      locSummary: row.locSummary,
      patientId: row.patientId
    });
    const ann = getCellStateEntry(cellAnnotations, cellKey);

    return (
      <div
        key={`${row.rowGroupKey ?? row.mrNumber}-${dayKey}`}
        className={dayBodyCellClass}
        style={{
          ...style,
          ...dayColStyleFlex
        }}
        role={interactiveDayCells ? "button" : undefined}
        tabIndex={interactiveDayCells ? 0 : undefined}
        onClick={interactiveDayCells ? () => handleDayCellActivate(row, dayKey) : undefined}
        onKeyDown={
          interactiveDayCells
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDayCellActivate(row, dayKey);
                }
              }
            : undefined
        }
        title={[
          `Name: ${row.name}`,
          `MR: ${row.mrNumber}`,
          `Date: ${dayKey}`,
          `Auth: ${row.authStart || "-"} – ${row.authEnd || "-"}`,
          `Auth #: ${row.authorizationNumber || "-"}`,
          `LOC: ${row.locSummary || loc || "-"}`,
          `Hours: ${formatHours(hours)}`,
          `Admit: ${row.admit || "-"}`,
          `Discharge: ${row.discharge || "-"}`,
          ann && cellHasNotes(ann)
            ? `Notes (${activeNotesForPreview(ann).length}): ${activeNotesForPreview(ann)
                .slice(0, 3)
                .map((n) => String(n.body || "").replace(/\s+/g, " ").trim())
                .join(" · ")
                .slice(0, 220)}${activeNotesForPreview(ann).length > 3 ? "…" : ""}`
            : null,
          ann?.completed ? "Complete" : null
        ]
          .filter(Boolean)
          .join("\n")}
      >
        <div className={dayBodyInnerClass}>
          <span className="tabular-nums">{formatHours(hours)}</span>
          {ann?.completed ? (
            <span
              className="pointer-events-none absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold leading-none text-emerald-600 shadow-sm ring-1 ring-slate-200/90"
              title="Complete"
              aria-hidden
            >
              ✓
            </span>
          ) : null}
          {ann && cellHasNotes(ann) ? (
            <span
              className="pointer-events-none absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white"
              title={`${activeNotesForPreview(ann).length} note(s)`}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    );
  };

  const renderDayCellTd = (row, dayKey) => {
    const entry = row.dailyEntries?.[dayKey];
    const hours = Number(entry?.hours ?? 0);
    const loc = entry?.loc || "";
    const style = getCellStyle({
      cellDate: dayKey,
      hours,
      admit: row.admit,
      discharge: row.discharge,
      loc
    });
    const cellKey = buildCellStateKey({
      mrNumber: row.mrNumber,
      date: dayKey,
      authStart: row.authStart,
      authEnd: row.authEnd,
      authorizationNumber: row.authorizationNumber,
      locSummary: row.locSummary,
      patientId: row.patientId
    });
    const ann = getCellStateEntry(cellAnnotations, cellKey);

    return (
      <td
        key={`${row.rowGroupKey ?? row.mrNumber}-${dayKey}`}
        className={dayBodyCellClass}
        style={{ ...style, ...dayColStyleTable }}
        role={interactiveDayCells ? "button" : undefined}
        tabIndex={interactiveDayCells ? 0 : undefined}
        onClick={interactiveDayCells ? () => handleDayCellActivate(row, dayKey) : undefined}
        onKeyDown={
          interactiveDayCells
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDayCellActivate(row, dayKey);
                }
              }
            : undefined
        }
        title={[
          `Name: ${row.name}`,
          `MR: ${row.mrNumber}`,
          `Date: ${dayKey}`,
          `Auth: ${row.authStart || "-"} – ${row.authEnd || "-"}`,
          `Auth #: ${row.authorizationNumber || "-"}`,
          `LOC: ${row.locSummary || loc || "-"}`,
          `Hours: ${formatHours(hours)}`,
          `Admit: ${row.admit || "-"}`,
          `Discharge: ${row.discharge || "-"}`,
          ann && cellHasNotes(ann)
            ? `Notes (${activeNotesForPreview(ann).length}): ${activeNotesForPreview(ann)
                .slice(0, 3)
                .map((n) => String(n.body || "").replace(/\s+/g, " ").trim())
                .join(" · ")
                .slice(0, 220)}${activeNotesForPreview(ann).length > 3 ? "…" : ""}`
            : null,
          ann?.completed ? "Complete" : null
        ]
          .filter(Boolean)
          .join("\n")}
      >
        <div className={dayBodyInnerClass}>
          <span className="tabular-nums">{formatHours(hours)}</span>
          {ann?.completed ? (
            <span
              className="pointer-events-none absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold leading-none text-emerald-600 shadow-sm ring-1 ring-slate-200/90"
              title="Complete"
              aria-hidden
            >
              ✓
            </span>
          ) : null}
          {ann && cellHasNotes(ann) ? (
            <span
              className="pointer-events-none absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white"
              title={`${activeNotesForPreview(ann).length} note(s)`}
              aria-hidden
            />
          ) : null}
        </div>
      </td>
    );
  };

  const renderFixedCells = (row) =>
    FIXED_COLUMNS.map((column, index) => (
      <div
        key={`${row.rowGroupKey ?? row.mrNumber}-${column.key}`}
        className={`${cellClass} sticky z-20 shrink-0 bg-white`}
        style={{
          left: `${LEFT_OFFSETS[index]}px`,
          minWidth: `${column.width}px`,
          maxWidth: `${column.width}px`,
          flex: "0 0 auto",
          boxSizing: "border-box"
        }}
      >
        {renderFixedCell(row, column)}
      </div>
    ));

  return (
    <div
      ref={scrollRef}
      className="h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="relative text-sm" style={{ minWidth: `${gridMinWidth}px` }}>
        {effectiveVirtualized && (
          <div className="sticky top-0 z-40 bg-slate-100">
            <div className="flex w-max min-w-full">
              {FIXED_COLUMNS.map((column, index) => (
                <div
                  key={column.key}
                  className={`${headerClass} sticky top-0 z-50 shrink-0`}
                  style={{
                    left: `${LEFT_OFFSETS[index]}px`,
                    minWidth: `${column.width}px`,
                    maxWidth: `${column.width}px`,
                    flex: "0 0 auto",
                    boxSizing: "border-box"
                  }}
                >
                  {column.label}
                </div>
              ))}
              {dayHeaders.map((day) => (
                <div key={day.key} className={dayHeaderCellClass} style={dayColStyleFlex}>
                  {day.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {effectiveVirtualized ? (
          <div style={{ height: `${totalHeight}px`, position: "relative" }}>
            {virtualRows.map((virtualRow) => {
              const row = report.rows[virtualRow.index];
              return (
                <div
                  key={`${row.rowGroupKey ?? row.mrNumber}-${virtualRow.index}`}
                  className="absolute left-0 top-0 flex w-max min-w-full hover:bg-slate-50"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`,
                    minWidth: `${gridMinWidth}px`
                  }}
                >
                  {renderFixedCells(row)}
                  {dayHeaders.map((day) => renderDayCellDiv(row, day.key))}
                </div>
              );
            })}
          </div>
        ) : (
          <table
            className="w-max border-collapse text-sm"
            style={{ tableLayout: "fixed", width: `${gridMinWidth}px`, minWidth: `${gridMinWidth}px` }}
          >
            <colgroup>
              {FIXED_COLUMNS.map((column) => (
                <col key={`col-${column.key}`} style={{ width: column.width }} />
              ))}
              {dayHeaders.map((day) => (
                <col key={`col-day-${day.key}`} style={{ width: dayColumnWidth }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-40 bg-slate-100">
              <tr>
                {FIXED_COLUMNS.map((column, index) => (
                  <th
                    key={column.key}
                    className={`${headerClass} sticky z-50 bg-slate-100`}
                    style={{
                      left: `${LEFT_OFFSETS[index]}px`,
                      width: column.width,
                      minWidth: column.width,
                      maxWidth: column.width,
                      boxSizing: "border-box"
                    }}
                  >
                    {column.label}
                  </th>
                ))}
                {dayHeaders.map((day) => (
                  <th key={day.key} className={dayHeaderCellClass} style={dayColStyleTable}>
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, index) => {
                const groupStart = rowSpanMeta.startByRowIndex[index] === index;
                const rowSpan = rowSpanMeta.spansByStartIndex[index] || 1;
                return (
                  <tr key={`${row.rowGroupKey ?? row.mrNumber}-${index}`} className="hover:bg-slate-50">
                    {groupStart && (
                      <td
                        rowSpan={rowSpan}
                        className="sticky z-20 border border-slate-200 bg-white px-3 py-2 text-center text-slate-700 align-middle"
                        style={{
                          left: `${LEFT_OFFSETS[0]}px`,
                          minWidth: `${FIXED_COLUMNS[0].width}px`,
                          maxWidth: `${FIXED_COLUMNS[0].width}px`
                        }}
                      >
                        {row.mrNumber || "-"}
                      </td>
                    )}
                    {groupStart && (
                      <td
                        rowSpan={rowSpan}
                        className="sticky z-20 border border-slate-200 bg-white px-3 py-2 text-center text-slate-700 align-middle"
                        style={{
                          left: `${LEFT_OFFSETS[1]}px`,
                          minWidth: `${FIXED_COLUMNS[1].width}px`,
                          maxWidth: `${FIXED_COLUMNS[1].width}px`
                        }}
                      >
                        {row.name || "-"}
                      </td>
                    )}
                    {groupStart && (
                      <td
                        rowSpan={rowSpan}
                        className="sticky z-20 border border-slate-200 bg-white px-3 py-2 text-center text-slate-700 align-middle"
                        style={{
                          left: `${LEFT_OFFSETS[2]}px`,
                          minWidth: `${FIXED_COLUMNS[2].width}px`,
                          maxWidth: `${FIXED_COLUMNS[2].width}px`
                        }}
                      >
                        {row.admit || "-"}
                      </td>
                    )}
                    {groupStart && (
                      <td
                        rowSpan={rowSpan}
                        className="sticky z-20 border border-slate-200 bg-white px-3 py-2 text-center text-slate-700 align-middle"
                        style={{
                          left: `${LEFT_OFFSETS[3]}px`,
                          minWidth: `${FIXED_COLUMNS[3].width}px`,
                          maxWidth: `${FIXED_COLUMNS[3].width}px`
                        }}
                      >
                        {row.discharge || "-"}
                      </td>
                    )}

                    <td
                      className="sticky z-20 border border-slate-200 bg-white px-3 py-2 text-slate-700"
                      style={{
                        left: `${LEFT_OFFSETS[4]}px`,
                        minWidth: `${FIXED_COLUMNS[4].width}px`,
                        maxWidth: `${FIXED_COLUMNS[4].width}px`
                      }}
                    >
                      {`${row.authStart || "-"} - ${row.authEnd || "-"}`}
                    </td>
                    <td
                      className="sticky z-20 border border-slate-200 bg-white px-3 py-2 text-slate-700"
                      style={{
                        left: `${LEFT_OFFSETS[5]}px`,
                        minWidth: `${FIXED_COLUMNS[5].width}px`,
                        maxWidth: `${FIXED_COLUMNS[5].width}px`
                      }}
                    >
                      {row.locSummary || "-"}
                    </td>

                    {dayHeaders.map((day) => renderDayCellTd(row, day.key))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
