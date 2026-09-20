const express = require("express");
const {
  getAllClaims,
  reviewClaim,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/claims", protect, adminOnly, getAllClaims);
router.patch("/claims/:claimId", protect, adminOnly, reviewClaim);

module.exports = router;
