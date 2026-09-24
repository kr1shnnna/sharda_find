
const Handover = require("../models/Handover");
const Item = require("../models/Item");

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

    // 2. Only lost items can have a handover
    if (item.type !== "lost") {
      return res.status(400).json({
        message: "Handover can only be reported for lost items",
      });
    }

    // 3. Someone must have already reported finding the item
    if (!item.foundBy) {
      return res.status(400).json({
        message: "No finder has been reported for this item",
      });
    }

    // 4. Only the recorded finder can report the handover
    if (item.foundBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the recorded finder can report this handover",
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

module.exports = {
  reportHandover,
};


