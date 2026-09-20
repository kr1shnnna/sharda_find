const Item = require("../models/Item");

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
    const item = await Item.findById(req.params.id).populate(
      "reportedBy",
      "name email"
    );

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    res.status(200).json({
      item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch item details",
      error: error.message,
    });
  }
};


module.exports = {
  createItem,
  getItems,
  getMyItems,
  getItemById,
};

