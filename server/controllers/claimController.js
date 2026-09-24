const Claim = require("../models/Claim");
const Item = require("../models/Item");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const createNotification = require("../utils/createNotification");

const createClaim = async (req, res) => {
  try {
    const { itemId, ownershipProof, message } = req.body;

    if (!itemId || !ownershipProof) {
      return res.status(400).json({
        message: "Item ID and ownership proof are required",
      });
    }

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    if (item.reportedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot claim an item you posted yourself",
      });
    }

    if (item.status !== "active") {
      return res.status(400).json({
        message: "This item is not currently available for claims",
      });
    }

    const existingClaim = await Claim.findOne({
      item: itemId,
      claimant: req.user._id,
      status: "pending",
    });

    if (existingClaim) {
      return res.status(409).json({
        message: "You already have a pending claim for this item",
      });
    }

    const uploadResults = req.files?.length
      ? await Promise.all(
          req.files.map((file) =>
            uploadToCloudinary(file, "sharda-find/claim-evidence"),
          ),
        )
      : [];

    const evidenceImages = uploadResults.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
    }));

    const claim = await Claim.create({
      item: itemId,
      claimant: req.user._id,
      ownershipProof,
      message,
      evidenceImages,
    });

    item.status = "claim-pending";
    await item.save();

    await createNotification({
      recipient: item.reportedBy,
      type: "claim-submitted",
      title: "New Claim Submitted",
      message: "Someone has submitted a claim for your found item.",
      item: item._id,
      claim: claim._id,
    });

    res.status(201).json({
      message:
        "Claim submitted successfully. The Lost & Found Department will review it.",
      claim,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to submit claim",
      error: error.message,
    });
  }
};

const getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.find({
      claimant: req.user._id,
    })
      .populate("item", "title type category location status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: claims.length,
      claims,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch your claims",
      error: error.message,
    });
  }
};

module.exports = {
  createClaim,
  getMyClaims,
};
