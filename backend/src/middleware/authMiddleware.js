const { AppError } = require("../utils/errors");
const { getFirebaseAuth } = require("../config/firebaseAdmin");
const { adminEmails } = require("../config/env");

function readBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function requireAuth(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      throw new AppError("Unauthorized", 401);
    }
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    const email = decoded.email || null;
    const emailLower = String(email || "").toLowerCase();
    const adminByEmail = Array.isArray(adminEmails) && adminEmails.includes(emailLower);
    const facilitiesFromClaims = Array.isArray(decoded.facilities)
      ? decoded.facilities.filter((x) => Number.isInteger(Number(x))).map((x) => Number(x))
      : [];
    req.user = {
      uid: decoded.uid,
      email,
      name: decoded.name || decoded.email || "",
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      provider: decoded.firebase?.sign_in_provider || "firebase"
    };
    req.user.admin = Boolean(decoded.admin) || adminByEmail;
    req.user.facilities = facilitiesFromClaims;
    next();
  } catch (error) {
    if (error.statusCode) return next(error);
    next(new AppError("Unauthorized", 401));
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.admin) {
    return next(new AppError("Forbidden", 403));
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
