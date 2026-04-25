const express = require("express");
const { getTransactions } = require("../controllers/transactionsController");

const router = express.Router();

router.get("/transactions", getTransactions);

module.exports = router;