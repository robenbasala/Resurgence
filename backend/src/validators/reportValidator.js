const dayjs = require("dayjs");
const { AppError } = require("../utils/errors");

function validateReportQuery(query) {
  const now = dayjs();
  const rawYear = query.year ? Number(query.year) : now.year();
  const rawMonth = query.month ? Number(query.month) : now.month() + 1;
  const hasRange =
    query.fromYear || query.fromMonth || query.toYear || query.toMonth;

  const fromYear = query.fromYear ? Number(query.fromYear) : rawYear;
  const fromMonth = query.fromMonth ? Number(query.fromMonth) : rawMonth;
  const toYear = query.toYear ? Number(query.toYear) : fromYear;
  const toMonth = query.toMonth ? Number(query.toMonth) : fromMonth;

  const allYears = [rawYear, fromYear, toYear];
  const allMonths = [rawMonth, fromMonth, toMonth];

  if (allYears.some((y) => !Number.isInteger(y) || y < 2000 || y > 2100)) {
    throw new AppError("year values must be integers between 2000 and 2100", 400);
  }

  if (allMonths.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) {
    throw new AppError("month values must be integers between 1 and 12", 400);
  }

  if (dayjs(`${toYear}-${toMonth}-01`).isBefore(dayjs(`${fromYear}-${fromMonth}-01`), "month")) {
    throw new AppError("range end must be after or equal to range start", 400);
  }

  const name = typeof query.name === "string" ? query.name.trim() : "";
  const mrNumber = typeof query.mrNumber === "string" ? query.mrNumber.trim() : "";

  return {
    year: hasRange ? undefined : rawYear,
    month: hasRange ? undefined : rawMonth,
    fromYear,
    fromMonth,
    toYear,
    toMonth,
    name,
    mrNumber
  };
}

module.exports = { validateReportQuery };
