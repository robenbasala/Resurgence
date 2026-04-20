const sql = require("mssql");
const { db } = require("./env");

let poolPromise;

function parseServerConfig() {
  const rawServer = String(db.server || "").trim();
  const fallbackInstance = String(db.instanceName || "").trim();

  // Accept either:
  // - DB_SERVER=host
  // - DB_SERVER=host\instance
  // - DB_SERVER=host,port
  // - DB_SERVER=host,port\instance (port is preferred)
  const [hostPortPart, inlineInstance = ""] = rawServer.split("\\");
  const [hostPart, inlinePort = ""] = hostPortPart.split(",");

  const server = hostPart.trim();
  const parsedPort = Number((inlinePort || "").trim());
  const instanceName = (inlineInstance || fallbackInstance).trim();

  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : db.port;
  return {
    server,
    port,
    instanceName
  };
}

function validateConfig() {
  const required = ["server", "database", "user", "password"];
  const missing = required.filter((key) => !db[key]);
  if (missing.length) {
    throw new Error(`Missing DB settings: ${missing.join(", ")}`);
  }
}

function getPool() {
  if (!poolPromise) {
    validateConfig();
    const parsed = parseServerConfig();
    const options = {
      encrypt: db.encrypt,
      trustServerCertificate: db.trustServerCertificate
    };

    // Prefer direct TCP (server + port). Instance name resolution can fail across networks.
    if (!parsed.port && parsed.instanceName) {
      options.instanceName = parsed.instanceName;
    }

    poolPromise = new sql.ConnectionPool({
      user: db.user,
      password: db.password,
      server: parsed.server,
      database: db.database,
      port: parsed.port,
      connectionTimeout: db.connectionTimeoutMs,
      requestTimeout: db.requestTimeoutMs,
      options,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    })
      .connect()
      .then((pool) => pool)
      .catch((error) => {
        poolPromise = undefined;
        throw error;
      });
  }

  return poolPromise;
}

module.exports = { getPool, sql };
