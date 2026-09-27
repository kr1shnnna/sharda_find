
const express = require("express");

const {
  getAllClaims,
  reviewClaim,
  getAllHandovers,
  reviewHandover,
  returnItemFromDepartment,

} = require("../controllers/adminController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Claim management
router.get(
  "/claims",
  protect,
  adminOnly,
  getAllClaims
);

router.patch(
  "/claims/:claimId",
  protect,
  adminOnly,
  reviewClaim
);

// Handover management
router.get(
  "/handovers",
  protect,
  adminOnly,
  getAllHandovers
);

router.patch(
  "/handovers/:handoverId",
  protect,
  adminOnly,
  reviewHandover
);

// Department item return

router.patch(
  "/items/:itemId/return",
  protect,
  adminOnly,
  returnItemFromDepartment
);

module.exports = router;

