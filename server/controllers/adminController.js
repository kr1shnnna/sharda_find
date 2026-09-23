const Claim = require("../models/Claim");
const Item = require("../models/Item");

const getAllClaims = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const claims = await Claim.find(filter)
      .populate(
        "item",
        "title type category location images status pickupLocation",
      )
      .populate("claimant", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: claims.length,
      claims,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch claims",
      error: error.message,
    });
  }
};

const reviewClaim = async (req, res) => {
  try {
    const { status, reviewNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be approved or rejected",
      });
    }

    const claim = await Claim.findById(req.params.claimId);

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found",
      });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({
        message: "This claim has already been reviewed",
      });
    }

    const item = await Item.findById(claim.item);

    if (!item) {
      return res.status(404).json({
        message: "Associated item not found",
      });
    }

    if (!item.normalizedTitle) {
      item.normalizedTitle = item.title
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    if (!item.normalizedLocation) {
      item.normalizedLocation = item.location
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    claim.status = status;
    claim.reviewedBy = req.user._id;
    claim.reviewNote = reviewNote || "";

    if (status === "approved") {
      item.status = "claim-pending";
    } else {
      item.status = "active";
    }

    await item.save();
    await claim.save();

    const responseMessage =
      status === "approved"
        ? "Your claim has been approved. Please visit the Lost & Found Department with your valid Sharda University ID to collect your item."
        : "Your claim could not be verified based on the information provided.";

    res.status(200).json({
      message: responseMessage,
      claim,
      item,
    });
    
  } catch (error) {
    res.status(500).json({
      message: "Unable to review claim",
      error: error.message,
    });
  }
};

module.exports = {
  getAllClaims,
  reviewClaim,
};
