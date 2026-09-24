
const express = require("express");

const {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  markMessagesAsRead,
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



router.get(
  "/conversation/:conversationId/messages",
  protect,
  getMessages
);




router.patch(
  "/conversation/:conversationId/read",
  protect,
  markMessagesAsRead
);





module.exports = router;

