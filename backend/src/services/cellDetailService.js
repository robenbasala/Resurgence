const {
  fetchEvaluationsForCell,
  fetchSessionsForCell
} = require("../repositories/cellDetailRepository");

async function getCellDetail({ mrNumber, date }) {
  const [evaluations, sessions] = await Promise.all([
    fetchEvaluationsForCell({ mrNumber, date }),
    fetchSessionsForCell({ mrNumber, date })
  ]);
  return { evaluations, sessions };
}

module.exports = { getCellDetail };
