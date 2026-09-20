const express = require("express");
const {
  createClaim,
  getMyClaims,
} = require("../controllers/claimController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  upload.array("evidenceImages", 2),
  createClaim
);

router.get("/my-claims", protect, getMyClaims);

module.exports = router;
