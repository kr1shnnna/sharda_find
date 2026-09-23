
const express = require("express");

const {
  getOrCreateConversation,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/conversation/:claimId",
  protect,
  getOrCreateConversation
);

module.exports = router;
