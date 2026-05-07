const {
  fetchAvailableYears,
  fetchReportRecords,
  normalizeDate
} = require("../repositories/reportRepository");
const { getMonthRange, getMonthSpanRange } = require("../utils/date");

function createPatientRow(baseRecord, rowGroupKey) {
  return {
    uniqueKey: baseRecord.UniqueKey ?? null,
    rowGroupKey: rowGroupKey ?? null,
    mrNumber: String(baseRecord.mrNumber ?? ""),
    patientId: baseRecord.PatientId ?? null,
    name: baseRecord.Name ?? "",
    admit: normalizeDate(baseRecord.Admit),
    discharge: normalizeDate(baseRecord.Discharge),
    authorizationNumber: baseRecord.AuthorizationNumber ?? "",
    authStart: normalizeDate(baseRecord.AuthStart),
    authEnd: normalizeDate(baseRecord.AuthEnd),
    locSummary: baseRecord.LOC ?? "",
    dailyEntries: {}
  };
}

function roundToTwo(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function buildDayEntry(existing, record) {
  const currentHours = Number(record.TotalHours ?? 0);
  if (!existing) {
    return {
      hours: roundToTwo(currentHours),
      loc: record.LOC ?? ""
    };
  }

  return {
    hours: roundToTwo(existing.hours + currentHours),
    loc: existing.loc || record.LOC || ""
  };
}

function buildRowGroupKey(record) {
  const mr = String(record.mrNumber ?? "");
  const authStart = normalizeDate(record.AuthStart) || "";
  const authEnd = normalizeDate(record.AuthEnd) || "";
  const loc = String(record.LOC ?? "");
  const authorizationNumber = String(record.AuthorizationNumber ?? "");
  return [mr, authStart, authEnd, loc, authorizationNumber].join("|");
}

async function getMonthlyReport({
  year,
  month,
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  name,
  mrNumber
}) {
  const hasRange = fromYear && fromMonth && toYear && toMonth;
  const { start, end, days } = hasRange
    ? getMonthSpanRange(fromYear, fromMonth, toYear, toMonth)
    : getMonthRange(year, month);
  const records = await fetchReportRecords({
    startDate: start,
    endDate: end,
    name,
    mrNumber
  });

  const rowMap = new Map();
  for (const record of records) {
    const rowKey = buildRowGroupKey(record);
    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, createPatientRow(record, rowKey));
    }
    const row = rowMap.get(rowKey);
    const dayKey = normalizeDate(record.DayDate);
    if (!dayKey) continue;
    row.dailyEntries[dayKey] = buildDayEntry(row.dailyEntries[dayKey], record);
  }

  return {
    year: hasRange ? fromYear : year,
    month: hasRange ? fromMonth : month,
    fromYear: hasRange ? fromYear : year,
    fromMonth: hasRange ? fromMonth : month,
    toYear: hasRange ? toYear : year,
    toMonth: hasRange ? toMonth : month,
    days,
    rows: Array.from(rowMap.values()).sort((a, b) =>
      String(a.mrNumber || "").localeCompare(String(b.mrNumber || ""), undefined, { numeric: true })
    )
  };
}

async function getReportMeta() {
  const years = await fetchAvailableYears();
  return {
    years,
    months: Array.from({ length: 12 }, (_, i) => i + 1)
  };
}

module.exports = { getMonthlyReport, getReportMeta };
