const Claim = require("../models/Claim");
const Item = require("../models/Item");
const Handover = require("../models/Handover");

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

const reviewHandover = async (req, res) => {
  try {
    const { status, note } = req.body;

    // 1. Validate the requested status
    if (!["confirmed", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be confirmed or rejected",
      });
    }

    // 2. Find the handover
    const handover = await Handover.findById(req.params.handoverId);

    if (!handover) {
      return res.status(404).json({
        message: "Handover not found",
      });
    }

    // 3. Only pending handovers can be reviewed
    if (handover.status !== "pending") {
      return res.status(400).json({
        message: "This handover has already been reviewed",
      });
    }

    // 4. Find the associated item
    const item = await Item.findById(handover.item);

    if (!item) {
      return res.status(404).json({
        message: "Associated item not found",
      });
    }

    // 5. Record who reviewed the handover
    handover.status = status;
    handover.reviewedBy = req.user._id;
    handover.reviewedAt = new Date();
    handover.note = note || "";

    // 6. Update the actual physical location
    if (status === "confirmed") {
      item.itemLocation = "lost-found-department";
    } else {
      item.itemLocation = "with-finder";
    }

    await item.save();
    await handover.save();

    res.status(200).json({
      message:
        status === "confirmed"
          ? "Handover confirmed successfully"
          : "Handover rejected successfully",
      handover,
      item,
    });
  } catch (error) {
    console.error("Review handover error:", error);

    res.status(500).json({
      message: "Unable to review handover",
    });
  }
};



module.exports = {
  getAllClaims,
  reviewClaim,
  reviewHandover,
};
