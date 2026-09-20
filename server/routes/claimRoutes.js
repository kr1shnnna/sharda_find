const express = require("express");
const {
  createClaim,
  getMyClaims,
} = require("../controllers/claimController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createClaim);
router.get("/my-claims", protect, getMyClaims);

module.exports = router;
