const dayjs = require("dayjs");
const { AppError } = require("../utils/errors");

function validateCellDetailQuery(query) {
  const mrNumber = typeof query.mrNumber === "string" ? query.mrNumber.trim() : "";
  if (!mrNumber) {
    throw new AppError("mrNumber is required", 400);
  }
  if (mrNumber.length > 100) {
    throw new AppError("mrNumber is too long", 400);
  }

  const rawDate = typeof query.date === "string" ? query.date.trim() : "";
  if (!rawDate) {
    throw new AppError("date is required (YYYY-MM-DD)", 400);
  }

  const parsed = dayjs(rawDate, "YYYY-MM-DD", true);
  if (!parsed.isValid()) {
    throw new AppError("date must be YYYY-MM-DD", 400);
  }

  return {
    mrNumber,
    date: parsed.format("YYYY-MM-DD")
  };
}

module.exports = { validateCellDetailQuery };
