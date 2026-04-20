import dayjs from "dayjs";

function escapeCsvValue(value) {
  if (value === null || typeof value === "undefined") return "";
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export function exportReportToCsv(report) {
  const staticHeaders = [
    "MR Number",
    "Name",
    "Admit",
    "Discharge",
    "Auth Start",
    "Auth End",
    "LOC Summary"
  ];
  const dayHeaders = report.days.map((day) => dayjs(day).format("M/D"));
  const headers = [...staticHeaders, ...dayHeaders];

  const rows = report.rows.map((row) => {
    const fixed = [
      row.mrNumber,
      row.name,
      row.admit || "",
      row.discharge || "",
      row.authStart || "",
      row.authEnd || "",
      row.locSummary || ""
    ];
    const dayValues = report.days.map((day) => {
      const value = Number(row.dailyEntries?.[day]?.hours ?? 0);
      return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
    });
    return [...fixed, ...dayValues];
  });

  const csvContent = [headers, ...rows]
    .map((line) => line.map(escapeCsvValue).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `session-hours-${report.fromYear}-${String(report.fromMonth).padStart(2, "0")}-to-${report.toYear}-${String(report.toMonth).padStart(2, "0")}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
