const dotenv = require("dotenv");

dotenv.config();

const toBool = (value, fallback = false) => {
  if (typeof value === "undefined") return fallback;
  return String(value).toLowerCase() === "true";
};

module.exports = {
  port: Number(process.env.PORT) || 5000,
  db: {
    server: process.env.DB_SERVER,
    instanceName: process.env.DB_INSTANCE || "",
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 1433,
    connectionTimeoutMs: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 30000,
    requestTimeoutMs: Number(process.env.DB_REQUEST_TIMEOUT_MS) || 120000,
    encrypt: toBool(process.env.DB_ENCRYPT, false),
    trustServerCertificate: toBool(process.env.DB_TRUST_SERVER_CERTIFICATE, true)
  },
  sessionHoursView: process.env.SESSION_HOURS_VIEW || "dbo.vwSessionHours"
};
