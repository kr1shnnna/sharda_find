const Handover = require("../models/Handover");
const Item = require("../models/Item");
const User = require("../models/User");
const createNotification = require("../utils/createNotification");

const reportHandover = async (req, res) => {
  try {
    const { itemId } = req.params;

    // 1. Find the item
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    if (!["lost", "found"].includes(item.type)) {
      return res.status(400).json({
        message: "Handover is not available for this item",
      });
    }

    const finderId = item.type === "found" ? item.reportedBy : item.foundBy;

    if (!finderId) {
      return res.status(400).json({
        message: "No finder is associated with this item",
      });
    }

    if (finderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the person who has the item can report this handover",
      });
    }

    // 5. Check whether a pending handover already exists
    const existingPendingHandover = await Handover.findOne({
      item: item._id,
      status: "pending",
    });

    if (existingPendingHandover) {
      return res.status(409).json({
        message: "A handover is already pending for this item",
      });
    }

    // 6. Create the handover request
    const handover = await Handover.create({
      item: item._id,
      submittedBy: req.user._id,
      status: "pending",
    });

    const io = req.app.get("io");

    // 7. Find the admin
    const admin = await User.findOne({ role: "admin" });

    // 8. Notify the admin
    if (admin) {
      await createNotification({
        recipient: admin._id,
        type: "handover-submitted",
        title: "New Handover Request",
        message:
          "A finder has reported handing over an item to the Lost & Found Department.",
        item: item._id,
        io,
      });
    }

    res.status(201).json({
      message:
        "Handover reported successfully. Waiting for Lost & Found Department confirmation.",
      handover,
    });
  } catch (error) {
    console.error("Report handover error:", error);

    res.status(500).json({
      message: "Unable to report handover",
    });
  }
};

const reviewHandover = async (req, res) => {
  try {
    const io = req.app.get("io");

    const { status, note } = req.body;

    // 1. Validate the status
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

    // 3. Prevent reviewing an already reviewed handover
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

    // 5. Update handover information
    handover.status = status;
    handover.reviewedBy = req.user._id;
    handover.reviewedAt = new Date();
    handover.note = note || "";

    // 6. Update the physical location of the item
    if (status === "confirmed") {
      item.itemLocation = "lost-found-department";
    } else {
      item.itemLocation = "with-finder";
    }

    // 7. Save both changes
    await item.save();
    await handover.save();

    // 8. Notify the finder
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
  reportHandover,
  reviewHandover,
};
