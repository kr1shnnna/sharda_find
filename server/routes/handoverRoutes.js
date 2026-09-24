
const express = require("express");

const {
  reportHandover,
} = require("../controllers/handoverController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/:itemId",
  protect,
  reportHandover
);

module.exports = router;


