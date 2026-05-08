const dotenv = require("dotenv");
const { getFirebaseAuth } = require("../src/config/firebaseAdmin");

dotenv.config();

async function run() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  const mode = String(process.argv[3] || "on").trim().toLowerCase();
  const initialPassword = String(process.argv[4] || process.env.ADMIN_BOOTSTRAP_PASSWORD || "Admin@123456");
  const adminEnabled = mode !== "off";

  if (!email) {
    throw new Error("Usage: npm run set-admin -- user@example.com [on|off] [initialPassword]");
  }

  const auth = getFirebaseAuth();
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error?.code !== "auth/user-not-found" || !adminEnabled) {
      throw error;
    }
    user = await auth.createUser({
      email,
      password: initialPassword,
      emailVerified: true
    });
    // eslint-disable-next-line no-console
    console.log(`User did not exist, created: ${email}`);
    // eslint-disable-next-line no-console
    console.log(`Initial password: ${initialPassword}`);
  }
  const existingClaims = user.customClaims || {};

  await auth.setCustomUserClaims(user.uid, {
    ...existingClaims,
    admin: adminEnabled
  });

  // Force token refresh for active sessions by bumping valid-since timestamp.
  await auth.revokeRefreshTokens(user.uid);

  // eslint-disable-next-line no-console
  console.log(`Admin claim ${adminEnabled ? "enabled" : "disabled"} for ${email} (${user.uid})`);
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message || error);
  process.exit(1);
});
