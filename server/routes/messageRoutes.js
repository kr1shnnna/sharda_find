
const express = require("express");

const {
  getOrCreateConversation,
  sendMessage,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/conversation/:itemId",
  protect,
  getOrCreateConversation
);


router.post(
  "/conversation/:conversationId",
  protect,
  sendMessage
);



module.exports = router;

