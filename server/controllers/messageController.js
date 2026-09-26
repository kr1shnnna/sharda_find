const Conversation = require("../models/Conversation");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const Message = require("../models/Message");

const createNotification = require("../utils/createNotification");

/*
 * GET OR CREATE CONVERSATION
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    /*
     * Messaging is not available once the item
     * has been handed over to the department.
     */
    if (item.itemLocation === "lost-found-department") {
      return res.status(400).json({
        message:
          "Messaging is unavailable because this item has been handed over to the Lost & Found Department.",
      });
    }

    let participants;
    let claim = null;

    /*
     * LOST ITEM
     *
     * Conversation is between:
     * reportedBy + foundBy
     */
    if (item.type === "lost") {
      if (!item.foundBy) {
        return res.status(400).json({
          message: "No one has reported finding this item yet",
        });
      }

      participants = [item.reportedBy, item.foundBy];
    } else if (item.type === "found") {
      /*
       * FOUND ITEM
       *
       * Conversation is between:
       * reportedBy + claimant
       */
      claim = await Claim.findOne({
        item: item._id,
        status: {
          $in: ["pending", "approved"],
        },
      }).sort({
        createdAt: -1,
      });

      if (!claim) {
        return res.status(400).json({
          message: "No active claim exists for this item",
        });
      }

      participants = [item.reportedBy, claim.claimant];
    }

    /*
     * Make sure the current user
     * is one of the participants.
     */
    const isParticipant = participants.some(
      (participant) => participant.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    /*
     * Find existing conversation
     */
    let conversation = await Conversation.findOne({
      item: item._id,
      participants: {
        $all: participants,
      },
    })
      .populate("participants", "name email")
      .populate("item", "title type category location")
      .populate("claim");

    /*
     * Create conversation if it doesn't exist
     */
    if (!conversation) {
      conversation = await Conversation.create({
        item: item._id,
        claim: claim ? claim._id : null,
        participants,
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "name email")
        .populate("item", "title type category location")
        .populate("claim");
    }

    return res.status(200).json({
      message: "Conversation retrieved successfully",
      conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      message: "Unable to get conversation",
    });
  }
};

/*
 * GET CONVERSATION BY ID
 */

const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "name email")
      .populate(
        "item",
        [
          "title",
          "type",
          "category",
          "location",
          "itemLocation",
          "status",
          "reportedBy",
          "foundBy",
          "finderHandedOver",
          "returnConfirmedByOwner",
          "returnConfirmedAt",
        ].join(" "),
      )
      .populate("claim");

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    /*
     * Make sure the current user
     * is a participant.
     */
    const isParticipant = conversation.participants.some(
      (participant) => participant._id.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    return res.status(200).json({
      message: "Conversation retrieved successfully",
      conversation,
    });
  } catch (error) {
    console.error("Get conversation by ID error:", error);

    return res.status(500).json({
      message: "Unable to fetch conversation",
    });
  }
};

/*
 * GET MY CONVERSATIONS
 */
const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email")
      .populate("item", "title type category location")
      .populate("claim", "status")
      .sort({
        updatedAt: -1,
      });

    return res.status(200).json({
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error("Get my conversations error:", error);

    return res.status(500).json({
      message: "Unable to fetch conversations",
    });
  }
};

/*
 * SEND MESSAGE
 */
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const { text } = req.body;

    /*
     * Validate message text
     */
    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Message text is required",
      });
    }

    /*
     * Find conversation
     */
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    /*
     * Make sure sender is a participant
     */
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    /*
     * Check the current item.
     *
     * Messaging must stop once the item
     * has been handed over to the department.
     */
    const item = await Item.findById(conversation.item);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    if (item.itemLocation === "lost-found-department") {
      return res.status(400).json({
        message:
          "Messaging is unavailable because this item has been handed over to the Lost & Found Department.",
      });
    }

    /*
     * Create message
     */
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: text.trim(),
    });

    /*
     * Update conversation preview
     */
    conversation.lastMessage = message.text;

    await conversation.save();

    /*
     * Populate sender information
     */
    const populatedMessage = await message.populate("sender", "name email");

    /*
     * Get Socket.IO instance
     */
    const io = req.app.get("io");

    /*
     * REAL-TIME MESSAGE
     *
     * Everyone currently inside this
     * conversation receives the message.
     */
    if (io) {
      io.to(`conversation:${conversation._id}`).emit(
        "new-message",
        populatedMessage,
      );
    }

    /*
     * Find the other participant
     *
     * This person will receive the
     * notification.
     */
    const recipient = conversation.participants.find(
      (participant) => participant.toString() !== req.user._id.toString(),
    );

    /*
     * CREATE + EMIT NOTIFICATION
     */
    if (recipient) {
      /*
       * Save notification in MongoDB
       */
      await createNotification({
        recipient,
        type: "new-message",
        title: "New Message",
        message: "You have received a new message.",
        item: conversation.item,
        claim: conversation.claim,
        conversation: conversation._id,
      });

      /*
       * Send notification instantly
       * to the recipient's personal room.
       */
      if (io) {
        io.to(`user:${recipient.toString()}`).emit("new-notification", {
          type: "new-message",
          title: "New Message",
          message: "You have received a new message.",
          item: conversation.item,
          claim: conversation.claim,
          conversation: conversation._id,
        });
      }
    }

    return res.status(201).json({
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      message: "Unable to send message",
    });
  }
};

/*
 * GET MESSAGES
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    /*
     * Check participant
     */
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    /*
     * Fetch messages
     */
    const messages = await Message.find({
      conversation: conversation._id,
    })
      .populate("sender", "name email")
      .sort({
        createdAt: 1,
      });

    return res.status(200).json({
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    return res.status(500).json({
      message: "Unable to fetch messages",
    });
  }
};

/*
 * MARK MESSAGES AS READ
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    /*
     * Check participant
     */
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    /*
     * Mark only messages sent
     * by other users as read.
     */
    const result = await Message.updateMany(
      {
        conversation: conversation._id,
        sender: {
          $ne: req.user._id,
        },
        read: false,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    return res.status(200).json({
      message: "Messages marked as read",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark messages as read error:", error);

    return res.status(500).json({
      message: "Unable to mark messages as read",
    });
  }
};

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getConversationById,
};
