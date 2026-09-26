const Item = require("../models/Item");

const uploadToCloudinary = require("../utils/cloudinaryUpload");

const Claim = require("../models/Claim");

const createNotification = require("../utils/createNotification");

const Handover = require("../models/Handover");

const createItem = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      location,
      itemDate,
      itemLocation,
    } = req.body;

    if (
      !title ||
      !description ||
      !type ||
      !category ||
      !location ||
      !itemDate
    ) {
      return res.status(400).json({
        message: "Please provide all required item details",
      });
    }

    const normalizedTitle = title.trim().replace(/\s+/g, " ").toLowerCase();

    const normalizedLocation = location
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

    const itemDateValue = new Date(itemDate);

    if (Number.isNaN(itemDateValue.getTime())) {
      return res.status(400).json({
        message: "Please provide a valid item date",
      });
    }

    const duplicateItem = await Item.findOne({
      reportedBy: req.user._id,
      type,
      category,
      normalizedTitle,
      normalizedLocation,
      itemDate: itemDateValue,
      status: {
        $in: ["active", "claim-pending"],
      },
    });

    if (duplicateItem) {
      return res.status(409).json({
        message: "You already have an active post for this item.",
      });
    }

    const uploadResults = req.files?.length
      ? await Promise.all(
          req.files.map((file) =>
            uploadToCloudinary(file, "sharda-find/items"),
          ),
        )
      : [];

    const images = uploadResults.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
    }));

    const item = await Item.create({
      title,
      normalizedTitle,
      normalizedLocation,
      description,
      type,
      category,
      location,
      itemDate: itemDateValue,

      // A lost item is not physically held
      // by the person who posted it.
      //
      // For a found item, the creator can
      // specify where the item currently is.
      itemLocation: type === "found" ? itemLocation : null,

      images,
      reportedBy: req.user._id,
    });

    res.status(201).json({
      message: "Item posted successfully",
      item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to post item",
      error: error.message,
    });
  }
};

const getItems = async (req, res) => {
  try {
    const { type, category, location } = req.query;

    const filter = {
      status: "active",
    };

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    const items = await Item.find(filter)
      .populate("reportedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch items",
      error: error.message,
    });
  }
};

const getMyItems = async (req, res) => {
  try {
    const items = await Item.find({
      reportedBy: req.user._id,
    }).sort({ createdAt: -1 });

    const itemsWithHandover = await Promise.all(
      items.map(async (item) => {
        const latestHandover = await Handover.findOne({
          item: item._id,
        }).sort({ createdAt: -1 });

        return {
          ...item.toObject(),
          handover: latestHandover,
        };
      }),
    );

    res.status(200).json({
      count: itemsWithHandover.length,
      items: itemsWithHandover,
    });
  } catch (error) {
    console.error("Get my items error:", error);

    res.status(500).json({
      message: "Unable to fetch your items",
      error: error.message,
    });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("reportedBy", "name email")
      .populate("foundBy", "name email");

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    let eligibleClaim = null;

    // For a found item, find the latest
    // pending/approved claim.
    if (item.type === "found") {
      eligibleClaim = await Claim.findOne({
        item: item._id,
        status: {
          $in: ["pending", "approved"],
        },
      })
        .populate("claimant", "name email")
        .sort({
          createdAt: -1,
        });
    }

    res.status(200).json({
      item,
      eligibleClaim,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch item details",
      error: error.message,
    });
  }
};

const reportFoundItem = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the lost item
    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    // 2. Only lost items can be reported as found
    if (item.type !== "lost") {
      return res.status(400).json({
        message: "This action is only available for lost items",
      });
    }

    // 3. The owner cannot report finding
    // their own item
    if (item.reportedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot report finding your own lost item",
      });
    }

    // 4. Someone has already reported
    // finding this item
    if (item.foundBy) {
      return res.status(409).json({
        message: "Someone has already reported finding this item",
      });
    }

    // 5. Record the finder
    item.foundBy = req.user._id;

    // The item is currently with the finder.
    // It has NOT been handed over to the
    // department yet.
    item.itemLocation = "with-finder";

    await item.save();

    // 6. Create notification for the
    // original person who reported the item.
    await createNotification({
      recipient: item.reportedBy,
      type: "item-found",
      title: "Someone Found Your Item",
      message:
        "Someone has reported finding your lost item. You can now message them.",
      item: item._id,
    });

    // 7. Get Socket.IO instance
    const io = req.app.get("io");

    // 8. Send the notification instantly
    // to the original reporter's personal room.
    if (io) {
      io.to(`user:${item.reportedBy.toString()}`).emit("new-notification", {
        type: "item-found",
        title: "Someone Found Your Item",
        message:
          "Someone has reported finding your lost item. You can now message them.",
        item: item._id,
      });
    }

    return res.status(200).json({
      message: "Thank you for reporting the found item",
      item,
    });
  } catch (error) {
    console.error("Report found item error:", error);

    return res.status(500).json({
      message: "Unable to report found item",
    });
  }
};

const confirmFinderHandover = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    // Only lost items can be handed back to their owner
    if (item.type !== "lost") {
      return res.status(400).json({
        message: "This action is only available for lost items",
      });
    }

    // A finder must already be recorded
    if (!item.foundBy) {
      return res.status(400).json({
        message: "No finder has been reported for this item",
      });
    }

    // Only the recorded finder can confirm the handover
    if (item.foundBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the recorded finder can confirm this handover",
      });
    }

    // Item must still be active
    if (item.status !== "active") {
      return res.status(400).json({
        message: "This item is no longer active",
      });
    }

    // Prevent confirming twice
    if (item.returnConfirmedByOwner) {
      return res.status(400).json({
        message: "This item has already been confirmed by the owner",
      });
    }

    // Record that the finder has handed over the item
    item.finderHandedOver = true;

    await item.save();

    const io = req.app.get("io");

    // Notify the original owner
    await createNotification({
      recipient: item.reportedBy,
      type: "item-handover-confirmed",
      title: "Item Handed Over",
      message:
        "The finder has handed over your item. Please confirm that you received it.",
      item: item._id,
      io,
    });

    return res.status(200).json({
      message: "Handover recorded. Waiting for the owner to confirm receipt.",
      item,
    });
  } catch (error) {
    console.error("Confirm finder handover error:", error);

    return res.status(500).json({
      message: "Unable to confirm handover",
    });
  }
};

const confirmOwnerReceivedItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    // Only lost items can be returned to their owner
    if (item.type !== "lost") {
      return res.status(400).json({
        message: "This action is only available for lost items",
      });
    }

    // Only the original owner can confirm receipt
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the owner can confirm receiving this item",
      });
    }

    // Finder must have confirmed the handover first
    if (!item.finderHandedOver) {
      return res.status(400).json({
        message: "The finder has not yet confirmed handing over the item",
      });
    }

    // Prevent duplicate confirmation
    if (item.returnConfirmedByOwner) {
      return res.status(400).json({
        message: "You have already confirmed receiving this item",
      });
    }

    // Finalize the return
    item.status = "returned";

    item.returnConfirmedByOwner = req.user._id;

    item.returnConfirmedAt = new Date();

    await item.save();

    const io = req.app.get("io");

    // Notify the finder
    await createNotification({
      recipient: item.foundBy,
      type: "item-returned",
      title: "Item Returned Successfully",
      message:
        "The owner has confirmed receiving the item you found. The item is now marked as returned.",
      item: item._id,
      io,
    });

    return res.status(200).json({
      message: "Item marked as returned successfully",
      item,
    });
  } catch (error) {
    console.error("Confirm owner received item error:", error);

    return res.status(500).json({
      message: "Unable to confirm item receipt",
    });
  }
};


module.exports = {
  createItem,
  getItems,
  getMyItems,
  getItemById,
  reportFoundItem,
  confirmFinderHandover,
  confirmOwnerReceivedItem,
};
