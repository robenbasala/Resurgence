const crypto = require("crypto");
const { getPool, sql } = require("../config/db");

let ensureTablesPromise = null;

function ensureTables() {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      const pool = await getPool();
      await pool.request().query(`
        IF OBJECT_ID('dbo.UserFacilityAccess', 'U') IS NULL
        BEGIN
          CREATE TABLE dbo.UserFacilityAccess (
            UserUid NVARCHAR(128) NOT NULL,
            Email NVARCHAR(255) NULL,
            FacilityId INT NOT NULL,
            GrantedBy NVARCHAR(128) NULL,
            GrantedAt DATETIME2 NOT NULL CONSTRAINT DF_UserFacilityAccess_GrantedAt DEFAULT SYSUTCDATETIME(),
            CONSTRAINT PK_UserFacilityAccess PRIMARY KEY (UserUid, FacilityId)
          );
        END;

        IF OBJECT_ID('dbo.UserInvites', 'U') IS NULL
        BEGIN
          CREATE TABLE dbo.UserInvites (
            InviteToken NVARCHAR(128) NOT NULL PRIMARY KEY,
            Email NVARCHAR(255) NOT NULL,
            FacilitiesCsv NVARCHAR(500) NOT NULL,
            RoleName NVARCHAR(50) NOT NULL,
            ExpiresAt DATETIME2 NOT NULL,
            CreatedBy NVARCHAR(128) NULL,
            CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserInvites_CreatedAt DEFAULT SYSUTCDATETIME(),
            AcceptedByUid NVARCHAR(128) NULL,
            AcceptedAt DATETIME2 NULL
          );
          CREATE INDEX IX_UserInvites_Email ON dbo.UserInvites (Email);
        END;
      `);
    })();
  }
  return ensureTablesPromise;
}

function toFacilitiesCsv(facilityIds) {
  return Array.from(new Set((facilityIds || []).map((x) => Number(x)).filter((x) => Number.isInteger(x)))).join(",");
}

async function listUserFacilities() {
  await ensureTables();
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT UserUid, Email, FacilityId, GrantedAt
    FROM dbo.UserFacilityAccess
    ORDER BY Email ASC, UserUid ASC, FacilityId ASC
  `);
  return result.recordset;
}

async function replaceUserFacilities({ userUid, email, facilityIds, grantedBy }) {
  await ensureTables();
  const pool = await getPool();
  const tx = pool.transaction();
  await tx.begin();
  try {
    const removeReq = tx.request();
    removeReq.input("userUid", sql.NVarChar(128), userUid);
    await removeReq.query(`DELETE FROM dbo.UserFacilityAccess WHERE UserUid = @userUid;`);

    for (const facilityId of facilityIds) {
      const insertReq = tx.request();
      insertReq.input("userUid", sql.NVarChar(128), userUid);
      insertReq.input("email", sql.NVarChar(255), email || null);
      insertReq.input("facilityId", sql.Int, facilityId);
      insertReq.input("grantedBy", sql.NVarChar(128), grantedBy || null);
      await insertReq.query(`
        INSERT INTO dbo.UserFacilityAccess (UserUid, Email, FacilityId, GrantedBy)
        VALUES (@userUid, @email, @facilityId, @grantedBy);
      `);
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

async function createInvite({ email, facilityIds, roleName, expiresAt, createdBy }) {
  await ensureTables();
  const pool = await getPool();
  const token = crypto.randomBytes(24).toString("hex");
  const req = pool.request();
  req.input("inviteToken", sql.NVarChar(128), token);
  req.input("email", sql.NVarChar(255), email);
  req.input("facilitiesCsv", sql.NVarChar(500), toFacilitiesCsv(facilityIds));
  req.input("roleName", sql.NVarChar(50), roleName);
  req.input("expiresAt", sql.DateTime2, expiresAt);
  req.input("createdBy", sql.NVarChar(128), createdBy || null);
  await req.query(`
    INSERT INTO dbo.UserInvites (InviteToken, Email, FacilitiesCsv, RoleName, ExpiresAt, CreatedBy)
    VALUES (@inviteToken, @email, @facilitiesCsv, @roleName, @expiresAt, @createdBy);
  `);
  return token;
}

async function getInviteByToken(inviteToken) {
  await ensureTables();
  const pool = await getPool();
  const req = pool.request();
  req.input("inviteToken", sql.NVarChar(128), inviteToken);
  const result = await req.query(`
    SELECT TOP 1 InviteToken, Email, FacilitiesCsv, RoleName, ExpiresAt, AcceptedByUid, AcceptedAt
    FROM dbo.UserInvites
    WHERE InviteToken = @inviteToken
  `);
  return result.recordset[0] || null;
}

async function markInviteAccepted({ inviteToken, uid }) {
  await ensureTables();
  const pool = await getPool();
  const req = pool.request();
  req.input("inviteToken", sql.NVarChar(128), inviteToken);
  req.input("uid", sql.NVarChar(128), uid);
  await req.query(`
    UPDATE dbo.UserInvites
    SET AcceptedByUid = @uid, AcceptedAt = SYSUTCDATETIME()
    WHERE InviteToken = @inviteToken
  `);
}

async function listInvites() {
  await ensureTables();
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT InviteToken, Email, FacilitiesCsv, RoleName, ExpiresAt, CreatedAt, AcceptedByUid, AcceptedAt
    FROM dbo.UserInvites
    ORDER BY CreatedAt DESC
  `);
  return result.recordset;
}

module.exports = {
  listUserFacilities,
  replaceUserFacilities,
  createInvite,
  getInviteByToken,
  markInviteAccepted,
  listInvites
};
