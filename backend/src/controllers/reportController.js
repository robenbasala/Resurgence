const { getMonthlyReport, getReportMeta } = require("../services/reportService");
const { validateReportQuery } = require("../validators/reportValidator");

async function getReport(req, res, next) {
  try {
    const query = validateReportQuery(req.query);
    const data = await getMonthlyReport(query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getReportMetaController(req, res, next) {
  try {
    const data = await getReportMeta();
    res.json(data);
  } catch (error) {
    next(error);
  }
}

function healthCheck(req, res) {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getReport,
  getReportMetaController,
  healthCheck
};
