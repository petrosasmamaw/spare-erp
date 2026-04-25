const express = require("express");
const healthRoutes = require("./healthRoutes");
const productsRoutes = require("./productsRoutes");
const reportsRoutes = require("./reportsRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const transactionsRoutes = require("./transactionsRoutes");

const router = express.Router();

router.use(healthRoutes);
router.use(productsRoutes);
router.use(reportsRoutes);
router.use(dashboardRoutes);
router.use(transactionsRoutes);

module.exports = router;