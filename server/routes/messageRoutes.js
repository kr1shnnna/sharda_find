const express = require("express");

const {
  getOrCreateConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  markMessagesAsRead,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Get all conversations of the logged-in user
router.get(
  "/conversations",
  protect,
  getMyConversations
);

// Get or create conversation for an item
router.get(
  "/conversation/:itemId",
  protect,
  getOrCreateConversation
);

// Send a message
router.post(
  "/conversation/:conversationId",
  protect,
  sendMessage
);

// Get messages of a conversation
router.get(
  "/conversation/:conversationId/messages",
  protect,
  getMessages
);

// Mark messages as read
router.patch(
  "/conversation/:conversationId/read",
  protect,
  markMessagesAsRead
);

module.exports = router;
