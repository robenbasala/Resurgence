const dayjs = require("dayjs");
const { AppError } = require("../utils/errors");
const { FACILITIES } = require("../config/facilities");
const { getFirebaseAuth } = require("../config/firebaseAdmin");
const {
  listUserFacilities,
  replaceUserFacilities,
  createInvite,
  getInviteByToken,
  markInviteAccepted,
  listInvites
} = require("../repositories/adminRepository");

function parseFacilityIds(value) {
  const src = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(
    new Set(src.map((x) => Number(String(x).trim())).filter((x) => Number.isInteger(x)))
  );
}

function parseFacilitiesCsv(csv) {
  return parseFacilityIds(String(csv || ""));
}

function ensureValidFacilityIds(ids) {
  const allowed = new Set(FACILITIES.map((x) => x.id));
  if (ids.some((id) => !allowed.has(id))) {
    throw new AppError("Invalid facility id in request", 400);
  }
}

async function listFacilitiesController(req, res) {
  res.json({ facilities: FACILITIES });
}

async function listUsersController(req, res, next) {
  try {
    const rows = await listUserFacilities();
    const map = new Map();
    for (const row of rows) {
      const key = String(row.UserUid || "");
      if (!map.has(key)) {
        map.set(key, {
          uid: key,
          email: row.Email || "",
          facilities: []
        });
      }
      map.get(key).facilities.push(Number(row.FacilityId));
    }
    res.json({ users: Array.from(map.values()) });
  } catch (error) {
    next(error);
  }
}

async function updateUserFacilitiesController(req, res, next) {
  try {
    const userUid = String(req.params.uid || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const facilityIds = parseFacilityIds(req.body?.facilityIds);
    if (!userUid) throw new AppError("uid is required", 400);
    ensureValidFacilityIds(facilityIds);

    await replaceUserFacilities({
      userUid,
      email: email || null,
      facilityIds,
      grantedBy: req.user?.uid || null
    });
    await getFirebaseAuth().setCustomUserClaims(userUid, {
      facilities: facilityIds,
      admin: false
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function createInviteController(req, res, next) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const facilityIds = parseFacilityIds(req.body?.facilityIds);
    const expiresInDays = Number(req.body?.expiresInDays || 7);
    if (!email) throw new AppError("email is required", 400);
    if (!facilityIds.length) throw new AppError("At least one facility is required", 400);
    ensureValidFacilityIds(facilityIds);
    const expiresAt = dayjs().add(expiresInDays, "day").toDate();

    const inviteToken = await createInvite({
      email,
      facilityIds,
      roleName: "user",
      expiresAt,
      createdBy: req.user?.uid || null
    });
    const base = String(req.headers.origin || "").replace(/\/$/, "") || "http://localhost:5173";
    const inviteUrl = `${base}/signup?invite=${inviteToken}`;
    res.json({ inviteToken, inviteUrl });
  } catch (error) {
    next(error);
  }
}

async function listInvitesController(req, res, next) {
  try {
    const rows = await listInvites();
    const invites = rows.map((row) => ({
      token: row.InviteToken,
      email: row.Email,
      facilityIds: parseFacilitiesCsv(row.FacilitiesCsv),
      expiresAt: row.ExpiresAt,
      acceptedAt: row.AcceptedAt
    }));
    res.json({ invites });
  } catch (error) {
    next(error);
  }
}

async function getInviteInfoController(req, res, next) {
  try {
    const inviteToken = String(req.params.token || "").trim();
    if (!inviteToken) throw new AppError("invite token is required", 400);
    const invite = await getInviteByToken(inviteToken);
    if (!invite) throw new AppError("Invite not found", 404);
    if (invite.AcceptedAt) throw new AppError("Invite already used", 400);
    if (dayjs(invite.ExpiresAt).isBefore(dayjs())) throw new AppError("Invite expired", 400);
    res.json({
      email: invite.Email,
      facilityIds: parseFacilitiesCsv(invite.FacilitiesCsv),
      expiresAt: invite.ExpiresAt
    });
  } catch (error) {
    next(error);
  }
}

async function acceptInviteController(req, res, next) {
  try {
    const inviteToken = String(req.body?.inviteToken || "").trim();
    if (!inviteToken) throw new AppError("inviteToken is required", 400);
    const invite = await getInviteByToken(inviteToken);
    if (!invite) throw new AppError("Invite not found", 404);
    if (invite.AcceptedAt) throw new AppError("Invite already used", 400);
    if (dayjs(invite.ExpiresAt).isBefore(dayjs())) throw new AppError("Invite expired", 400);

    const inviteEmail = String(invite.Email || "").toLowerCase();
    const userEmail = String(req.user?.email || "").toLowerCase();
    if (!inviteEmail || inviteEmail !== userEmail) {
      throw new AppError("Invite email does not match signed-in user", 403);
    }

    const facilities = parseFacilitiesCsv(invite.FacilitiesCsv);
    await replaceUserFacilities({
      userUid: req.user.uid,
      email: req.user.email || null,
      facilityIds: facilities,
      grantedBy: req.user.uid
    });
    await getFirebaseAuth().setCustomUserClaims(req.user.uid, {
      facilities,
      admin: false
    });
    await markInviteAccepted({ inviteToken, uid: req.user.uid });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFacilitiesController,
  listUsersController,
  updateUserFacilitiesController,
  createInviteController,
  listInvitesController,
  getInviteInfoController,
  acceptInviteController
};
