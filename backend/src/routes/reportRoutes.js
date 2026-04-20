const express = require("express");
const {
  getReport,
  getReportMetaController,
  healthCheck
} = require("../controllers/reportController");

const router = express.Router();

router.get("/health", healthCheck);
router.get("/report/meta", getReportMetaController);
router.get("/report", getReport);

module.exports = { reportRouter: router };
