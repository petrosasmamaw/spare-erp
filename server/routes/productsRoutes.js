const express = require("express");
const {
  getProducts,
  createProduct,
  buyProduct,
  sellProduct,
} = require("../controllers/productsController");

const router = express.Router();

router.get("/products", getProducts);
router.post("/products", createProduct);
router.post("/products/:id/buy", buyProduct);
router.post("/products/:id/sell", sellProduct);

module.exports = router;