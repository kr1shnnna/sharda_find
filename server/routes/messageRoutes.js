
const express = require("express");

const {
  getOrCreateConversation,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/conversation/:itemId",
  protect,
  getOrCreateConversation
);

module.exports = router;

