const express = require("express");
const { getItemReports } = require("../controllers/reportsController");

const router = express.Router();

router.get("/item-reports", getItemReports);

module.exports = router;