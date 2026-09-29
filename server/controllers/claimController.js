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

    // The person who posted the found item cannot claim it.
    if (item.reportedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot claim an item you posted yourself",
      });
    }

    // Item must be available for claims.
    if (item.status !== "active") {
      return res.status(400).json({
        message: "This item is not currently available for claims",
      });
    }

    // Check whether this user already has a pending/approved claim.
    const existingClaim = await Claim.findOne({
      item: itemId,
      claimant: req.user._id,
      status: {
        $in: ["pending", "approved"],
      },
    });

    if (existingClaim) {
      return res.status(409).json({
        message:
          existingClaim.status === "approved"
            ? "Your claim for this item has already been approved"
            : "You already have a pending claim for this item",
      });
    }

    // Check whether another claimant has already been approved.
    const approvedClaim = await Claim.findOne({
      item: itemId,
      status: "approved",
    });

    if (approvedClaim) {
      return res.status(409).json({
        message: "This item has already been claimed",
      });
    }

    // Upload evidence images if provided.
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

    // Create the claim.
    const claim = await Claim.create({
      item: itemId,
      claimant: req.user._id,
      ownershipProof,
      message,
      evidenceImages,
    });

    // The item temporarily becomes claim-pending.
    item.status = "claim-pending";
    await item.save();

    const io = req.app.get("io");

    /*
     * CLAIM REVIEW ROUTING
     *
     * If the item is still with the finder:
     *     → finder receives the claim notification
     *
     * If the item is already with the Lost & Found Department:
     *     → admin receives the claim notification
     */

    if (item.itemLocation === "lost-found-department") {
      // Department-held item → notify admin.
      if (io) {
        io.to("admins").emit("admin-case-updated", {
          type: "claim-submitted",
          itemId: item._id,
          claimId: claim._id,
        });
      }

      // Find an admin to receive the notification.
      const User = require("../models/User");

      const admin = await User.findOne({
        role: "admin",
      });

      if (admin) {
        await createNotification({
          recipient: admin._id,
          type: "claim-submitted",
          title: "New Claim Requires Review",
          message:
            "A student has submitted an ownership claim for an item currently held by the Lost & Found Department.",
          item: item._id,
          claim: claim._id,
          io,
        });
      }

      return res.status(201).json({
        message:
          "Claim submitted successfully. The Lost & Found Department will review your claim.",
        claim,
      });
    }

    // Default / finder-held item.
    await createNotification({
      recipient: item.reportedBy,
      type: "claim-submitted",
      title: "New Claim Submitted",
      message: "Someone has submitted a claim for your found item.",
      item: item._id,
      claim: claim._id,
      io,
    });

    return res.status(201).json({
      message:
        "Claim submitted successfully. The finder will review your claim.",
      claim,
    });
  } catch (error) {
    console.error("Create claim error:", error);

    return res.status(500).json({
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
      .populate("item", "title type category location status itemLocation")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      count: claims.length,
      claims,
    });
  } catch (error) {
    console.error("Get my claims error:", error);

    return res.status(500).json({
      message: "Unable to fetch your claims",
      error: error.message,
    });
  }
};

/*

* Get claims submitted on items posted by
* the currently logged-in user.
*
* This is the finder/founder-side claim list.
  */
const getClaimsOnMyItems = async (req, res) => {
  try {
    const myItems = await Item.find({
      reportedBy: req.user._id,
    }).select("_id");

    const itemIds = myItems.map((item) => item._id);

    const claims = await Claim.find({
      item: {
        $in: itemIds,
      },
    })
      .populate("item", "title type category location status itemLocation")
      .populate("claimant", "name email")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      count: claims.length,
      claims,
    });
  } catch (error) {
    console.error("Get claims on my items error:", error);

    return res.status(500).json({
      message: "Unable to fetch claims on your items",
      error: error.message,
    });
  }
};

/*

* Approve a claim.
*
* Finder-held item:
* ```
  → finder can approve
  ```
*
* Department-held item:
* ```
  → admin should use adminController.reviewClaim()
  ```

*/
const approveClaim = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claim = await Claim.findById(claimId)
      .populate("item")
      .populate("claimant", "name email");

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found",
      });
    }

    const item = claim.item;

    if (!item) {
      return res.status(404).json({
        message: "Item associated with this claim was not found",
      });
    }

    /*
     * Department-held claims are handled
     * through the admin review workflow.
     */
    if (item.itemLocation === "lost-found-department") {
      return res.status(403).json({
        message:
          "This item is currently held by the Lost & Found Department. The claim must be reviewed by the Lost & Found Department.",
      });
    }

    // Only the finder/founder can approve
    // finder-held claims.
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the person who posted this item can review this claim",
      });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({
        message:
          claim.status === "approved"
            ? "This claim has already been approved"
            : "This claim has already been rejected",
      });
    }

    // Make sure another claim has not already
    // been approved for this item.
    const alreadyApproved = await Claim.findOne({
      item: item._id,
      status: "approved",
      _id: {
        $ne: claim._id,
      },
    });

    if (alreadyApproved) {
      return res.status(409).json({
        message: "Another claim for this item has already been approved",
      });
    }

    // Approve the claim.
    claim.status = "approved";
    claim.reviewedBy = req.user._id;
    claim.reviewNote = "";

    await claim.save();

    // The item is not marked returned yet.
    // The finder and owner still need to
    // communicate and complete the handover.
    item.status = "active";
    await item.save();

    const io = req.app.get("io");

    // Notify the claimant.
    await createNotification({
      recipient: claim.claimant._id,
      type: "claim-approved",
      title: "Claim Approved",
      message: "Your claim has been approved. You can now message the finder.",
      item: item._id,
      claim: claim._id,
      io,
    });

    return res.status(200).json({
      message: "Claim approved successfully. Messaging is now available.",
      claim,
    });
  } catch (error) {
    console.error("Approve claim error:", error);

    return res.status(500).json({
      message: "Unable to approve claim",
      error: error.message,
    });
  }
};

/*

* Reject a claim.
*
* Finder-held item:
* ```
  → finder can reject
  ```
*
* Department-held item:
* ```
  → admin should use adminController.reviewClaim()
  ```

*/
const rejectClaim = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claim = await Claim.findById(claimId)
      .populate("item")
      .populate("claimant", "name email");

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found",
      });
    }

    const item = claim.item;

    if (!item) {
      return res.status(404).json({
        message: "Item associated with this claim was not found",
      });
    }

    /*
     * Department-held claims are handled
     * through the admin review workflow.
     */
    if (item.itemLocation === "lost-found-department") {
      return res.status(403).json({
        message:
          "This item is currently held by the Lost & Found Department. The claim must be reviewed by the Lost & Found Department.",
      });
    }

    // Only the finder/founder can reject
    // finder-held claims.
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the person who posted this item can review this claim",
      });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({
        message:
          claim.status === "approved"
            ? "This claim has already been approved"
            : "This claim has already been rejected",
      });
    }

    // Reject the claim.
    claim.status = "rejected";
    claim.reviewedBy = req.user._id;
    claim.reviewNote = "";

    await claim.save();

    // Make the item available again.
    item.status = "active";
    await item.save();

    const io = req.app.get("io");

    // Notify the claimant.
    await createNotification({
      recipient: claim.claimant._id,
      type: "claim-rejected",
      title: "Claim Rejected",
      message: "Your claim for this item was rejected by the finder.",
      item: item._id,
      claim: claim._id,
      io,
    });

    return res.status(200).json({
      message: "Claim rejected successfully.",
      claim,
    });
  } catch (error) {
    console.error("Reject claim error:", error);

    ```
return res.status(500).json({
  message:
    "Unable to reject claim",
  error: error.message,
});
```;
  }
};

module.exports = {
  createClaim,
  getMyClaims,
  getClaimsOnMyItems,
  approveClaim,
  rejectClaim,
};
