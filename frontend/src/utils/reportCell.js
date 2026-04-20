import dayjs from "dayjs";

const COLORS = {
  black: "rgba(0,0,0,1)",
  sundayGray: "rgba(180,180,180,1)",
  green: "rgba(0,128,0,0.5)",
  blue: "rgba(0,112,192,1)",
  yellow: "rgba(255,255,0,1)",
  purple: "rgba(112,48,160,1)",
  pink: "rgba(255,199,206,1)",
  white: "rgba(255,255,255,1)"
};

function isDarkColor(backgroundColor) {
  return (
    backgroundColor === COLORS.black ||
    backgroundColor === COLORS.blue ||
    backgroundColor === COLORS.purple
  );
}

export function getCellStyle({ cellDate, hours, admit, discharge, loc }) {
  const parsedCellDate = dayjs(cellDate);
  const admitD = admit ? dayjs(admit) : null;
  const dischargeD = discharge ? dayjs(discharge) : null;
  const safeHours = Number(hours || 0);
  const safeLoc = String(loc || "").toUpperCase();

  let backgroundColor = COLORS.white;

  if (
    (admitD && parsedCellDate.isBefore(admitD, "day")) ||
    (dischargeD && parsedCellDate.isAfter(dischargeD, "day"))
  ) {
    backgroundColor = COLORS.black;
  } else if (parsedCellDate.day() === 0) {
    backgroundColor = COLORS.sundayGray;
  } else if (safeLoc.includes("DTX")) {
    backgroundColor = safeHours >= 6 ? COLORS.green : COLORS.blue;
  } else if (safeLoc.includes("RTC")) {
    backgroundColor = safeHours >= 6 ? COLORS.yellow : COLORS.blue;
  } else if (safeLoc.includes("PHP")) {
    backgroundColor = safeHours >= 6 ? COLORS.purple : COLORS.blue;
  } else if (safeLoc.includes("IOP")) {
    backgroundColor = safeHours >= 3 ? COLORS.pink : COLORS.blue;
  }

  return {
    backgroundColor,
    color: isDarkColor(backgroundColor) ? "#ffffff" : "#0f172a"
  };
}
