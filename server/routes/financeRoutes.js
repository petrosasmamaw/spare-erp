const express = require("express");
const {
  createFinanceEntry,
  getFinanceReports,
  getFinanceSummary,
  getSupplierCredits,
  paySupplierCredit,
} = require("../controllers/financeController");

const router = express.Router();

router.get("/finance/summary", getFinanceSummary);
router.get("/finance/reports", getFinanceReports);
router.get("/finance/supplier-credits", getSupplierCredits);
router.post("/finance/entry", createFinanceEntry);
router.post("/finance/pay-credit", paySupplierCredit);

module.exports = router;
