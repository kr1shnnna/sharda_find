
const Conversation = require("../models/Conversation");
const Claim = require("../models/Claim");
const Item = require("../models/Item");

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
          message: "No one has reported finding this item yet",
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
          message: "No active claim exists for this item",
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
        participant.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    // 5. Look for an existing conversation
    let conversation = await Conversation.findOne({
      item: item._id,
      participants: {
        $all: participants,
      },
    })
      .populate("participants", "name email")
      .populate("item", "title type category location")
      .populate("claim");

    // 6. Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await Conversation.create({
        item: item._id,
        claim: claim ? claim._id : null,
        participants,
      });

      conversation = await Conversation.findById(
        conversation._id
      )
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

module.exports = {
  getOrCreateConversation,
};

