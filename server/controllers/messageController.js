const Conversation = require("../models/Conversation");

const Claim = require("../models/Claim");

const Item = require("../models/Item");

const Message = require("../models/Message");

const createNotification = require("../utils/createNotification");

const getOrCreateConversation = async (req, res) => {
  try {
    const { itemId } = req.params;

    // 1. Find the item
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    let participants;

    let claim = null;

    // 2. LOST item workflow
    if (item.type === "lost") {
      // Someone must have reported finding the item
      if (!item.foundBy) {
        return res.status(400).json({
          message:
            "No one has reported finding this item yet",
        });
      }

      participants = [
        item.reportedBy,
        item.foundBy,
      ];
    }

    // 3. FOUND item workflow
    else if (item.type === "found") {
      // Find the relevant claim
      claim = await Claim.findOne({
        item: item._id,
        status: {
          $in: ["pending", "approved"],
        },
      }).sort({ createdAt: -1 });

      if (!claim) {
        return res.status(400).json({
          message:
            "No active claim exists for this item",
        });
      }

      participants = [
        item.reportedBy,
        claim.claimant,
      ];
    }

    // 4. Check whether the logged-in user is a participant
    const isParticipant = participants.some(
      (participant) =>
        participant.toString() ===
        req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        message:
          "You are not part of this conversation",
      });
    }

    // 5. Look for an existing conversation
    let conversation =
      await Conversation.findOne({
        item: item._id,
        participants: {
          $all: participants,
        },
      })
        .populate(
          "participants",
          "name email"
        )
        .populate(
          "item",
          "title type category location"
        )
        .populate("claim");

    // 6. Create conversation if it doesn't exist
    if (!conversation) {
      conversation =
        await Conversation.create({
          item: item._id,
          claim: claim
            ? claim._id
            : null,
          participants,
        });

      conversation =
        await Conversation.findById(
          conversation._id
        )
          .populate(
            "participants",
            "name email"
          )
          .populate(
            "item",
            "title type category location"
          )
          .populate("claim");
    }

    return res.status(200).json({
      message:
        "Conversation retrieved successfully",
      conversation,
    });
  } catch (error) {
    console.error(
      "Get conversation error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to get conversation",
    });
  }
};

const getMyConversations = async (req, res) => {
  try {
    const conversations =
      await Conversation.find({
        participants: req.user._id,
      })
        .populate(
          "participants",
          "name email"
        )
        .populate(
          "item",
          "title type category location"
        )
        .populate(
          "claim",
          "status"
        )
        .sort({
          updatedAt: -1,
        });

    return res.status(200).json({
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error(
      "Get my conversations error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to fetch conversations",
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId } =
      req.params;

    const { text } = req.body;

    // 1. Validate message text
    if (!text || !text.trim()) {
      return res.status(400).json({
        message:
          "Message text is required",
      });
    }

    // 2. Find the conversation
    const conversation =
      await Conversation.findById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        message:
          "Conversation not found",
      });
    }

    // 3. Check that the user is a participant
    const isParticipant =
      conversation.participants.some(
        (participant) =>
          participant.toString() ===
          req.user._id.toString()
      );

    if (!isParticipant) {
      return res.status(403).json({
        message:
          "You are not part of this conversation",
      });
    }

    // 4. Create the message
    const message =
      await Message.create({
        conversation:
          conversation._id,
        sender: req.user._id,
        text: text.trim(),
      });

    // 5. Update the latest message
    conversation.lastMessage =
      message.text;

    await conversation.save();

    // 6. Populate sender information
    const populatedMessage =
      await message.populate(
        "sender",
        "name email"
      );

    // 7. Emit real-time message
    const io = req.app.get("io");

    if (io) {
      io.to(
        `conversation:${conversation._id}`
      ).emit(
        "new-message",
        populatedMessage
      );
    }

    // 8. Find the other participant
    const recipient =
      conversation.participants.find(
        (participant) =>
          participant.toString() !==
          req.user._id.toString()
      );

    // 9. Create notification
    if (recipient) {
      await createNotification({
        recipient,
        type: "new-message",
        title: "New Message",
        message:
          "You have received a new message.",
        item: conversation.item,
        claim: conversation.claim,
        conversation:
          conversation._id,
      });
    }

    // 10. Return the created message
    return res.status(201).json({
      message:
        "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error(
      "Send message error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to send message",
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } =
      req.params;

    // 1. Find the conversation
    const conversation =
      await Conversation.findById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        message:
          "Conversation not found",
      });
    }

    // 2. Check that the user is a participant
    const isParticipant =
      conversation.participants.some(
        (participant) =>
          participant.toString() ===
          req.user._id.toString()
      );

    if (!isParticipant) {
      return res.status(403).json({
        message:
          "You are not part of this conversation",
      });
    }

    // 3. Get messages
    const messages =
      await Message.find({
        conversation:
          conversation._id,
      })
        .populate(
          "sender",
          "name email"
        )
        .sort({
          createdAt: 1,
        });

    return res.status(200).json({
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error(
      "Get messages error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to fetch messages",
    });
  }
};

const markMessagesAsRead = async (
  req,
  res
) => {
  try {
    const { conversationId } =
      req.params;

    // 1. Find the conversation
    const conversation =
      await Conversation.findById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        message:
          "Conversation not found",
      });
    }

    // 2. Check that the user is a participant
    const isParticipant =
      conversation.participants.some(
        (participant) =>
          participant.toString() ===
          req.user._id.toString()
      );

    if (!isParticipant) {
      return res.status(403).json({
        message:
          "You are not part of this conversation",
      });
    }

    // 3. Mark messages from the other participant as read
    const result =
      await Message.updateMany(
        {
          conversation:
            conversation._id,
          sender: {
            $ne: req.user._id,
          },
          read: false,
        },
        {
          $set: {
            read: true,
          },
        }
      );

    return res.status(200).json({
      message:
        "Messages marked as read",
      updatedCount:
        result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Mark messages as read error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to mark messages as read",
    });
  }
};

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  markMessagesAsRead,
};
