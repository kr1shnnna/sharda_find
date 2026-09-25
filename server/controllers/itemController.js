const Item = require("../models/Item");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

const Claim = require("../models/Claim");

const createItem = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      location,
      itemDate,
      returnMethod,
      pickupLocation,
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
      status: { $in: ["active", "claim-pending"] },
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
      returnMethod,
      pickupLocation,

      // A lost item is not physically held by the person who posted it.
      // For a found item, the creator can specify where the item currently is.
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

    if (type) filter.type = type;
    if (category) filter.category = category;

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

    res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
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

    // For a found item, find the latest pending/approved claim.
    if (item.type === "found") {
      eligibleClaim = await Claim.findOne({
        item: item._id,
        status: { $in: ["pending", "approved"] },
      })
        .populate("claimant", "name email")
        .sort({ createdAt: -1 });
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

    // 3. The owner cannot report finding their own item
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

    // The item is currently with the finder.
    // It has NOT been handed over to the department yet.
    item.itemLocation = "with-finder";

    await item.save();

    res.status(200).json({
      message: "Thank you for reporting the found item",
      item,
    });
  } catch (error) {
    console.error("Report found item error:", error);

    res.status(500).json({
      message: "Unable to report found item",
    });
  }
};

module.exports = {
  createItem,
  getItems,
  getMyItems,
  getItemById,
  reportFoundItem,
};
