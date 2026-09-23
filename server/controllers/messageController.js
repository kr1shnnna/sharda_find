
const Conversation = require("../models/Conversation");
const Claim = require("../models/Claim");

const getOrCreateConversation = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claim = await Claim.findById(claimId).populate("item");

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found",
      });
    }

    const poster = claim.item.reportedBy;
    const claimant = claim.claimant;

    // Only the item poster or claimant can access this conversation
    if (
      req.user._id.toString() !== poster.toString() &&
      req.user._id.toString() !== claimant.toString()
    ) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    let conversation = await Conversation.findOne({
      claim: claim._id,
    }).populate("participants", "name email");

    if (!conversation) {
      conversation = await Conversation.create({
        item: claim.item._id,
        claim: claim._id,
        participants: [poster, claimant],
      });

      conversation = await Conversation.findById(
        conversation._id
      ).populate("participants", "name email");
    }

    return res.status(200).json({
      message: "Conversation retrieved successfully",
      conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getOrCreateConversation,
};
