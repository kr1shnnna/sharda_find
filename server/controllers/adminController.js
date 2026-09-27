const Claim = require("../models/Claim");
const Item = require("../models/Item");
const Handover = require("../models/Handover");
const createNotification = require("../utils/createNotification");

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
    const io = req.app.get("io");

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
      item.status = "returned";
    } else {
      item.status = "active";
    }

    await item.save();
    await claim.save();

    await createNotification({
      recipient: claim.claimant,
      type: status === "approved" ? "claim-approved" : "claim-rejected",
      title: status === "approved" ? "Claim Approved" : "Claim Rejected",
      message:
        status === "approved"
          ? "Your claim has been approved. Please visit the Lost & Found Department with your valid Sharda University ID to collect your item."
          : "Your claim could not be verified based on the information provided.",
      item: item._id,
      claim: claim._id,
      io,
    });

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

const getAllHandovers = async (req, res) => {
  try {
    const filter = {};

    // Optional status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const handovers = await Handover.find(filter)
      .populate(
        "item",
        "title type category location images itemLocation status",
      )
      .populate("submittedBy", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: handovers.length,
      handovers,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch handovers",
      error: error.message,
    });
  }
};

const reviewHandover = async (req, res) => {
  try {
    const io = req.app.get("io");
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

    // 5. Make sure this is a valid lost/found item
    if (!["lost", "found"].includes(item.type)) {
      return res.status(400).json({
        message: "This item cannot be processed for department handover",
      });
    }

    // 6. The item must still be with the finder
    // when the admin confirms the handover.
    if (status === "confirmed" && item.itemLocation !== "with-finder") {
      return res.status(400).json({
        message:
          "This item is no longer with the finder, so the handover cannot be confirmed.",
      });
    }

    // 7. Returned or closed items cannot be processed
    if (["returned", "closed"].includes(item.status)) {
      return res.status(400).json({
        message:
          "This item is no longer active and cannot be processed for department handover.",
      });
    }

    // 8. Validate the admin note
    const cleanedNote = note?.trim() || "";

    if (cleanedNote.length > 500) {
      return res.status(400).json({
        message: "Handover note cannot exceed 500 characters",
      });
    }

    // 9. Record the admin review
    handover.status = status;
    handover.reviewedBy = req.user._id;
    handover.reviewedAt = new Date();
    handover.note = cleanedNote;

    // 10. Update the physical location
    if (status === "confirmed") {
      item.itemLocation = "lost-found-department";
    } else {
      item.itemLocation = "with-finder";
    }

    /*
     * Department handover does NOT mean the item
     * has been returned to its owner.
     *
     * Therefore the item remains active.
     */
    item.status = "active";

    // 11. Save both changes
    await item.save();
    await handover.save();

    // 12. Notify the student through Socket.IO + database
    await createNotification({
      recipient: handover.submittedBy,
      type: status === "confirmed" ? "handover-confirmed" : "handover-rejected",
      title:
        status === "confirmed" ? "Handover Confirmed" : "Handover Rejected",
      message:
        status === "confirmed"
          ? "The Lost & Found Department has confirmed receipt of the item."
          : "The Lost & Found Department could not confirm receipt of the item.",
      item: item._id,
      io,
    });

    return res.status(200).json({
      message:
        status === "confirmed"
          ? "Handover confirmed successfully"
          : "Handover rejected successfully",
      handover,
      item,
    });
  } catch (error) {
    console.error("Review handover error:", error);

    // Duplicate-key error
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This handover conflicts with an existing handover record.",
      });
    }

    // Mongoose validation error
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map(
        (validationError) => validationError.message,
      );

      return res.status(400).json({
        message:
          messages.length > 0 ? messages.join(", ") : "Invalid handover data.",
      });
    }

    // Invalid MongoDB ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid handover or item identifier.",
      });
    }

    // Unexpected server error
    return res.status(500).json({
      message: "Unable to review handover",
    });
  }
};

module.exports = {
  getAllClaims,
  reviewClaim,
  reviewHandover,
  getAllHandovers,
};
