const express = require("express");
const {
  createFinanceEntry,
  getFinanceReports,
  getFinanceSummary,
} = require("../controllers/financeController");

const router = express.Router();

router.get("/finance/summary", getFinanceSummary);
router.get("/finance/reports", getFinanceReports);
router.post("/finance/entry", createFinanceEntry);

module.exports = router;
