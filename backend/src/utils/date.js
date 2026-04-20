const dayjs = require("dayjs");

function getMonthRange(year, month) {
  const monthStart = dayjs(`${year}-${String(month).padStart(2, "0")}-01`).startOf("month");
  const monthEnd = monthStart.endOf("month");
  const days = [];

  for (let d = monthStart; d.isBefore(monthEnd) || d.isSame(monthEnd, "day"); d = d.add(1, "day")) {
    days.push(d.format("YYYY-MM-DD"));
  }

  return {
    start: monthStart.format("YYYY-MM-DD"),
    end: monthEnd.format("YYYY-MM-DD"),
    days
  };
}

function getMonthSpanRange(fromYear, fromMonth, toYear, toMonth) {
  const startMonth = dayjs(`${fromYear}-${String(fromMonth).padStart(2, "0")}-01`).startOf("month");
  const endMonth = dayjs(`${toYear}-${String(toMonth).padStart(2, "0")}-01`).endOf("month");
  const days = [];

  for (let d = startMonth; d.isBefore(endMonth) || d.isSame(endMonth, "day"); d = d.add(1, "day")) {
    days.push(d.format("YYYY-MM-DD"));
  }

  return {
    start: startMonth.format("YYYY-MM-DD"),
    end: endMonth.format("YYYY-MM-DD"),
    days
  };
}

module.exports = { getMonthRange, getMonthSpanRange };
