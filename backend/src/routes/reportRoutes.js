const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const {
  listFacilitiesController,
  listUsersController,
  updateUserFacilitiesController,
  createInviteController,
  listInvitesController,
  getInviteInfoController,
  acceptInviteController
} = require("../controllers/adminController");
const {
  getReport,
  getReportMetaController,
  getCellDetailController,
  getReportCellAnnotationsController,
  putReportCellAnnotationsController,
  healthCheck
} = require("../controllers/reportController");

const router = express.Router();

router.get("/health", healthCheck);
router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
router.get("/auth/invite/:token", getInviteInfoController);
router.post("/auth/invite/accept", requireAuth, acceptInviteController);

router.get("/admin/facilities", requireAuth, requireAdmin, listFacilitiesController);
router.get("/admin/users", requireAuth, requireAdmin, listUsersController);
router.put("/admin/users/:uid/facilities", requireAuth, requireAdmin, updateUserFacilitiesController);
router.post("/admin/invites", requireAuth, requireAdmin, createInviteController);
router.get("/admin/invites", requireAuth, requireAdmin, listInvitesController);

router.use(requireAuth);

router.get("/report/meta", getReportMetaController);
router.get("/report/cell-details", getCellDetailController);
router.get("/report/cell-annotations", getReportCellAnnotationsController);
router.put("/report/cell-annotations", putReportCellAnnotationsController);
router.get("/report", getReport);

module.exports = { reportRouter: router };
