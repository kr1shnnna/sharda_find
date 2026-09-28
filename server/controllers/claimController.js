const Claim = require("../models/Claim");
const Item = require("../models/Item");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const createNotification = require("../utils/createNotification");

const createClaim = async (req, res) => {
try {
const { itemId, ownershipProof, message } = req.body;

```
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
  status: { $in: ["pending", "approved"] },
});

if (existingClaim) {
  return res.status(409).json({
    message:
      existingClaim.status === "approved"
        ? "Your claim for this item has already been approved"
        : "You already have a pending claim for this item",
  });
}

const approvedClaim = await Claim.findOne({
  item: itemId,
  status: "approved",
});

if (approvedClaim) {
  return res.status(409).json({
    message: "This item has already been claimed",
  });
}

const uploadResults = req.files?.length
  ? await Promise.all(
      req.files.map((file) =>
        uploadToCloudinary(
          file,
          "sharda-find/claim-evidence"
        )
      )
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

const io = req.app.get("io");

/*
 * Notify the person who posted/found the item.
 *
 * For a FOUND item, item.reportedBy is the finder.
 */
await createNotification({
  recipient: item.reportedBy,
  type: "claim-submitted",
  title: "New Claim Submitted",
  message:
    "Someone has submitted a claim for your found item.",
  item: item._id,
  claim: claim._id,
  io,
});

return res.status(201).json({
  message:
    "Claim submitted successfully. The finder will review your claim.",
  claim,
});
```

} catch (error) {
console.error("Create claim error:", error);

```
return res.status(500).json({
  message: "Unable to submit claim",
  error: error.message,
});
```

}
};

/*

* Get claims submitted by the currently logged-in user.
  */
  const getMyClaims = async (req, res) => {
  try {
  const claims = await Claim.find({
  claimant: req.user._id,
  })
  .populate(
  "item",
  "title type category location status itemLocation"
  )
  .sort({ createdAt: -1 });

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

* Get claims submitted on items posted by the currently
* logged-in user.
*
* This is the founder/finder-side claim list.
  */
  const getClaimsOnMyItems = async (req, res) => {
  try {
  const myItems = await Item.find({
  reportedBy: req.user._id,
  }).select("_id");

  const itemIds = myItems.map((item) => item._id);

  const claims = await Claim.find({
  item: { $in: itemIds },
  })
  .populate(
  "item",
  "title type category location status itemLocation"
  )
  .populate(
  "claimant",
  "name email"
  )
  .sort({ createdAt: -1 });

  return res.status(200).json({
  count: claims.length,
  claims,
  });
  } catch (error) {
  console.error(
  "Get claims on my items error:",
  error
  );

  return res.status(500).json({
  message: "Unable to fetch claims on your items",
  error: error.message,
  });
  }
  };

/*

* Approve a claim.
*
* Only the person who posted the item can approve it.
*
* For a FOUND item:
* claimant submits claim
* ```
    ↓
  ```
* finder reviews claim
* ```
    ↓
  ```
* finder approves
* ```
    ↓
  ```
* messaging can be unlocked
  */
  const approveClaim = async (req, res) => {
  try {
  const { claimId } = req.params;

```
const claim = await Claim.findById(claimId)
```

```
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
 * Only the person who posted the item can
 * approve/reject its claim.
 */
if (
  item.reportedBy.toString() !==
  req.user._id.toString()
) {
  return res.status(403).json({
    message:
      "Only the person who posted this item can review this claim",
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

/*
 * Make sure another claim hasn't already
 * been approved for this item.
 */
const alreadyApproved = await Claim.findOne({
  item: item._id,
  status: "approved",
  _id: { $ne: claim._id },
});

if (alreadyApproved) {
  return res.status(409).json({
    message:
      "Another claim for this item has already been approved",
  });
}

claim.status = "approved";
claim.reviewedBy = req.user._id;
claim.reviewNote =
  req.body.reviewNote?.trim() || "";

await claim.save();

/*
 * Restore the item to active because the
 * direct founder ↔ claimant handover is now allowed.
 *
 * The item is not marked returned yet.
 */
item.status = "active";
await item.save();

const io = req.app.get("io");

await createNotification({
  recipient: claim.claimant._id,
  type: "claim-approved",
  title: "Claim Approved",
  message:
    "Your claim has been approved. You can now message the finder.",
  item: item._id,
  claim: claim._id,
  io,
});

return res.status(200).json({
  message:
    "Claim approved successfully. Messaging is now available.",
  claim,
});
```

} catch (error) {
console.error("Approve claim error:", error);

```
return res.status(500).json({
  message: "Unable to approve claim",
  error: error.message,
});
```

}
};

/*

* Reject a claim.
*
* Rejecting a claim does NOT return or close the item.
* The finder can still:
*
* * receive another valid claim
* * hand the item to the Lost & Found Department
    */
    const rejectClaim = async (req, res) => {
    try {
    const { claimId } = req.params;

```
const claim = await Claim.findById(claimId)
```

```
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
 * Only the person who posted the item can
 * reject its claim.
 */
if (
  item.reportedBy.toString() !==
  req.user._id.toString()
) {
  return res.status(403).json({
    message:
      "Only the person who posted this item can review this claim",
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

claim.status = "rejected";
claim.reviewedBy = req.user._id;
claim.reviewNote =
  req.body.reviewNote?.trim() || "";

await claim.save();

/*
 * The item becomes available again.
 *
 * The finder can still hand it over to the
 * Lost & Found Department.
 */
item.status = "active";
await item.save();

const io = req.app.get("io");

await createNotification({
  recipient: claim.claimant._id,
  type: "claim-rejected",
  title: "Claim Rejected",
  message:
    "Your claim for this item was rejected by the finder.",
  item: item._id,
  claim: claim._id,
  io,
});

return res.status(200).json({
  message: "Claim rejected successfully.",
  claim,
});
```

} catch (error) {
console.error("Reject claim error:", error);

```
return res.status(500).json({
  message: "Unable to reject claim",
  error: error.message,
});
```

}
};

module.exports = {
createClaim,
getMyClaims,
getClaimsOnMyItems,
approveClaim,
rejectClaim,
};
