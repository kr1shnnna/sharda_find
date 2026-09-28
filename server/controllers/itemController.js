const Item = require("../models/Item");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const Claim = require("../models/Claim");
const createNotification = require("../utils/createNotification");
const Handover = require("../models/Handover");


// =====================================================
// CREATE ITEM
// =====================================================

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

    const normalizedTitle = title
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

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

    // Prevent duplicate active posts
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

    // Upload images
    const uploadResults = req.files?.length
      ? await Promise.all(
          req.files.map((file) =>
            uploadToCloudinary(file, "sharda-find/items")
          )
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

      // LOST:
      // Item location stays null until someone finds it.

      // FOUND:
      // Item starts with the person who found it.
      itemLocation: type === "found" ? "with-finder" : null,

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


// =====================================================
// GET ALL ACTIVE ITEMS
// =====================================================

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


// =====================================================
// GET MY ITEMS
// =====================================================

const getMyItems = async (req, res) => {
  try {
    const items = await Item.find({
      $or: [
        { reportedBy: req.user._id },
        { foundBy: req.user._id },
      ],
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
      })
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


// =====================================================
// GET ITEM BY ID
// =====================================================

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

    // For a FOUND item:
    // Find the latest pending/approved claim.
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

    // Get latest department handover
    const latestHandover = await Handover.findOne({
      item: item._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      item: {
        ...item.toObject(),
        handover: latestHandover,
      },
      eligibleClaim,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch item details",
      error: error.message,
    });
  }
};


// =====================================================
// REPORT LOST ITEM AS FOUND
// =====================================================

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

    // 2. Only LOST items can be reported as found
    if (item.type !== "lost") {
      return res.status(400).json({
        message: "This action is only available for lost items",
      });
    }

    // 3. Owner cannot report finding their own item
    if (item.reportedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot report finding your own lost item",
      });
    }

    // 4. Someone has already reported finding this item
    if (item.foundBy) {
      return res.status(409).json({
        message: "Someone has already reported finding this item",
      });
    }

    // 5. Record the finder
    item.foundBy = req.user._id;

    // Item is currently with the finder.
    // It has NOT been handed over to the department.
    item.itemLocation = "with-finder";

    await item.save();

    // 6. Notify original reporter
    const notificationMessage =
      "Someone has reported finding your lost item. You can now message them.";

    const io = req.app.get("io");

    await createNotification({
      recipient: item.reportedBy,
      type: "item-found",
      title: "Someone Found Your Item",
      message: notificationMessage,
      item: item._id,
      io,
    });

    return res.status(200).json({
      message: "Thank you for reporting the found item",
      item,
    });
  } catch (error) {
    console.error("Report found item error:", error);

    return res.status(500).json({
      message: "Unable to report found item",
      error: error.message,
    });
  }
};


// =====================================================
// CONFIRM FINDER / FOUNDER HANDOVER
// =====================================================
//
// LOST ITEM:
//     finder = item.foundBy
//     owner  = item.reportedBy
//
// FOUND ITEM:
//     founder = item.reportedBy
//     owner   = claim.claimant
//
// For FOUND items, this is a direct student-to-student
// physical handover. Admin is NOT involved.
// =====================================================

const confirmFinderHandover = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }


    // =====================================================
    // LOST ITEM
    // Holder = foundBy
    // Owner = reportedBy
    // =====================================================

    if (item.type === "lost") {
      // A finder must already be recorded
      if (!item.foundBy) {
        return res.status(400).json({
          message: "No finder has been reported for this item",
        });
      }

      // Only the recorded finder can confirm handover
      if (
        item.foundBy.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "Only the recorded finder can confirm this handover",
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
          message:
            "This item has already been confirmed by the owner",
        });
      }

      // Record that finder handed over item
      item.finderHandedOver = true;

      await item.save();

      const io = req.app.get("io");

      // Notify original owner
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
        message:
          "Handover recorded. Waiting for the owner to confirm receipt.",
        item,
      });
    }


    // =====================================================
    // FOUND ITEM
    // Holder = reportedBy
    // Owner = claim.claimant
    // =====================================================

    if (item.type === "found") {
      // Find the latest active claim.
      //
      // IMPORTANT:
      // Direct student-to-student return does not require
      // admin approval.
      const claim = await Claim.findOne({
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

      // Only the person who posted the FOUND item
      // can confirm handing it over.
      if (
        item.reportedBy.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "Only the person holding the item can confirm this handover",
        });
      }

      // The item can be active or claim-pending.
      //
      // claim-pending is expected immediately after
      // someone submits a claim.
      if (
        !["active", "claim-pending"].includes(item.status)
      ) {
        return res.status(400).json({
          message:
            "This item is no longer available for handover",
        });
      }

      // Prevent confirming twice
      if (item.finderHandedOver) {
        return res.status(400).json({
          message: "This item has already been handed over",
        });
      }

      // Record that the founder has handed over the item
      item.finderHandedOver = true;

      await item.save();

      const io = req.app.get("io");

      // Notify claimant
      await createNotification({
        recipient: claim.claimant,
        type: "item-handover-confirmed",
        title: "Item Handed Over",
        message:
          "The founder has handed over the item. Please confirm that you received it.",
        item: item._id,
        claim: claim._id,
        io,
      });

      return res.status(200).json({
        message:
          "Handover recorded. Waiting for the claimant to confirm receipt.",
        item,
      });
    }


    return res.status(400).json({
      message: "This item type does not support handover",
    });

  } catch (error) {
    console.error(
      "Confirm finder handover error:",
      error
    );

    return res.status(500).json({
      message: "Unable to confirm handover",
    });
  }
};


// =====================================================
// CONFIRM OWNER / CLAIMANT RECEIVED ITEM
// =====================================================
//
// LOST ITEM:
//     owner = reportedBy
//
// FOUND ITEM:
//     owner = claim.claimant
//
// This final confirmation changes the item status
// to "returned".
// =====================================================

const confirmOwnerReceivedItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }


    // =====================================================
    // LOST ITEM
    // Owner = reportedBy
    // Finder = foundBy
    // =====================================================

    if (item.type === "lost") {
      // Only original owner can confirm receipt
      if (
        item.reportedBy.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "Only the owner can confirm receiving this item",
        });
      }

      // Finder must have confirmed handover first
      if (!item.finderHandedOver) {
        return res.status(400).json({
          message:
            "The finder has not yet confirmed handing over the item",
        });
      }

      // Prevent duplicate confirmation
      if (item.returnConfirmedByOwner) {
        return res.status(400).json({
          message:
            "You have already confirmed receiving this item",
        });
      }

      // Finalize return
      item.status = "returned";
      item.returnConfirmedByOwner = req.user._id;
      item.returnConfirmedAt = new Date();

      await item.save();

      const io = req.app.get("io");

      // Notify finder
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
    }


    // =====================================================
    // FOUND ITEM
    // Owner = claim.claimant
    // Holder = reportedBy
    // =====================================================

    if (item.type === "found") {
      // Find latest active claim
      const claim = await Claim.findOne({
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

      // Only claimant can confirm receipt
      if (
        claim.claimant.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "Only the claimant can confirm receiving this item",
        });
      }

      // Founder must have confirmed handover first
      if (!item.finderHandedOver) {
        return res.status(400).json({
          message:
            "The founder has not yet confirmed handing over the item",
        });
      }

      // Prevent duplicate confirmation
      if (item.returnConfirmedByOwner) {
        return res.status(400).json({
          message:
            "You have already confirmed receiving this item",
        });
      }

      // Finalize return
      item.status = "returned";
      item.returnConfirmedByOwner = req.user._id;
      item.returnConfirmedAt = new Date();

      await item.save();

      const io = req.app.get("io");

      // Notify founder
      await createNotification({
        recipient: item.reportedBy,
        type: "item-returned",
        title: "Item Returned Successfully",
        message:
          "The claimant has confirmed receiving the item. The item is now marked as returned.",
        item: item._id,
        claim: claim._id,
        io,
      });

      return res.status(200).json({
        message: "Item marked as returned successfully",
        item,
      });
    }


    return res.status(400).json({
      message:
        "This item type does not support receipt confirmation",
    });

  } catch (error) {
    console.error(
      "Confirm owner received item error:",
      error
    );

    return res.status(500).json({
      message: "Unable to confirm item receipt",
    });
  }
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createItem,
  getItems,
  getMyItems,
  getItemById,
  reportFoundItem,
  confirmFinderHandover,
  confirmOwnerReceivedItem,
};
