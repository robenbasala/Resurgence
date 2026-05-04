const express = require("express");
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
router.get("/report/meta", getReportMetaController);
router.get("/report/cell-details", getCellDetailController);
router.get("/report/cell-annotations", getReportCellAnnotationsController);
router.put("/report/cell-annotations", putReportCellAnnotationsController);
router.get("/report", getReport);

module.exports = { reportRouter: router };
