const express = require("express");

const {
createClaim,
getMyClaims,
getClaimsOnMyItems,
approveClaim,
rejectClaim,
} = require("../controllers/claimController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Submit a claim
router.post(
"/",
protect,
upload.array("evidenceImages", 2),
createClaim
);

// Claims submitted by the logged-in user
router.get(
"/my-claims",
protect,
getMyClaims
);

// Claims submitted on items posted by the logged-in user
router.get(
"/my-items",
protect,
getClaimsOnMyItems
);

// Finder/founder approves a claim
router.patch(
"/:claimId/approve",
protect,
approveClaim
);

// Finder/founder rejects a claim
router.patch(
"/:claimId/reject",
protect,
rejectClaim
);

module.exports = router;

