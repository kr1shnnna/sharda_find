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

    // 2. Handover is only available for lost/found items
    if (!["lost", "found"].includes(item.type)) {
      return res.status(400).json({
        message: "Handover is not available for this item",
      });
    }

    /*
     * For a FOUND item:
     * reportedBy = person currently holding the item
     *
     * For a LOST item:
     * foundBy = person currently holding the item
     */
    const finderId =
      item.type === "found"
        ? item.reportedBy
        : item.foundBy;

    if (!finderId) {
      return res.status(400).json({
        message: "No person is associated with the item holder",
      });
    }

    // 3. Only the person currently holding the item can
    // report the department handover.
    if (finderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message:
          "Only the person who has the item can report this handover",
      });
    }

    // 4. Item must still be active
    if (item.status !== "active") {
      return res.status(400).json({
        message: "This item is no longer active",
      });
    }

    // 5. Item must currently be with the finder
    if (item.itemLocation !== "with-finder") {
      return res.status(400).json({
        message: "This item is not currently with the finder",
      });
    }

    // 6. Check whether a pending handover already exists
    const existingPendingHandover = await Handover.findOne({
      item: item._id,
      status: "pending",
    });

    if (existingPendingHandover) {
      return res.status(409).json({
        message: "A handover is already pending for this item",
      });
    }

    // 7. Create the handover request
    const handover = await Handover.create({
      item: item._id,
      submittedBy: req.user._id,
      status: "pending",
    });

    const io = req.app.get("io");

    // 8. Find the admin
    const admin = await User.findOne({
      role: "admin",
    });

    // 9. Notify the admin
    if (admin) {
      await createNotification({
        recipient: admin._id,
        type: "handover-submitted",
        title: "New Handover Request",
        message:
          "A student has reported handing over an item to the Lost & Found Department.",
        item: item._id,
        io,
      });
    }

    return res.status(201).json({
      message:
        "Handover reported successfully. Waiting for Lost & Found Department confirmation.",
      handover,
    });
  } catch (error) {
    console.error("Report handover error:", error);

    // Duplicate-key error from the unique pending-handover index.
    if (
      error.code === 11000 &&
      error.keyPattern?.item
    ) {
      return res.status(409).json({
        message:
          "A pending handover already exists for this item.",
      });
    }

    // Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(
        error.errors || {}
      ).map(
        (validationError) =>
          validationError.message
      );

      return res.status(400).json({
        message:
          messages.length > 0
            ? messages.join(", ")
            : "Invalid handover data.",
      });
    }

    // Invalid MongoDB ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid item identifier.",
      });
    }

    return res.status(500).json({
      message: "Unable to report handover",
    });
  }
};

module.exports = {
  reportHandover,
};
