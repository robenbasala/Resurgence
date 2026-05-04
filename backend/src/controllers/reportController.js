const { getMonthlyReport, getReportMeta } = require("../services/reportService");
const { getCellDetail } = require("../services/cellDetailService");
const {
  listAnnotationsForReportQuery,
  saveAnnotation
} = require("../services/reportCellAnnotationsService");
const { validateReportQuery } = require("../validators/reportValidator");
const { validateCellDetailQuery } = require("../validators/cellDetailValidator");
const {
  validateAnnotationListQuery,
  validateAnnotationPutBody
} = require("../validators/reportCellAnnotationsValidator");

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

async function getCellDetailController(req, res, next) {
  try {
    const query = validateCellDetailQuery(req.query);
    const data = await getCellDetail(query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getReportCellAnnotationsController(req, res, next) {
  try {
    const query = validateAnnotationListQuery(req.query);
    const data = await listAnnotationsForReportQuery(query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function putReportCellAnnotationsController(req, res, next) {
  try {
    const body = validateAnnotationPutBody(req.body);
    const data = await saveAnnotation(body);
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
  getCellDetailController,
  getReportCellAnnotationsController,
  putReportCellAnnotationsController,
  healthCheck
};
