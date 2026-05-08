const admin = require("firebase-admin");
const { AppError } = require("../utils/errors");

let firebaseApp = null;

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || "";
  return raw ? raw.replace(/\\n/g, "\n") : "";
}

function ensureFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID || "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new AppError("Firebase Admin is not configured on server", 500);
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
  return firebaseApp;
}

function getFirebaseAuth() {
  ensureFirebaseAdmin();
  return admin.auth();
}

module.exports = {
  getFirebaseAuth
};
