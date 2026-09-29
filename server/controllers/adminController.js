const Claim = require("../models/Claim");
const Item = require("../models/Item");
const Handover = require("../models/Handover");
const createNotification = require("../utils/createNotification");

const getAllClaims = async (req, res) => {
try {
const filter = {};

if (req.query.status) {
  filter.status = req.query.status;
}

const claims = await Claim.find(filter)
  .populate(
    "item",
    "title type category location images status pickupLocation itemLocation reportedBy"
  )
  .populate("claimant", "name email")
  .populate("reviewedBy", "name email")
  .sort({ createdAt: -1 });

res.status(200).json({
  count: claims.length,
  claims,
});


} catch (error) {
console.error("Get all claims error:", error);


res.status(500).json({
  message: "Unable to fetch claims",
  error: error.message,
});


}
};

const reviewClaim = async (req, res) => {
try {
const io = req.app.get("io");
const { decision, reviewNote } = req.body;


if (!["approved", "rejected"].includes(decision)) {
  return res.status(400).json({
    message: "Status must be approved or rejected",
  });
}

const claim = await Claim.findById(req.params.claimId);

if (!claim) {
  return res.status(404).json({
    message: "Claim not found",
  });
}

if (claim.status !== "pending") {
  return res.status(400).json({
    message: "This claim has already been reviewed",
  });
}

const item = await Item.findById(claim.item);

if (!item) {
  return res.status(404).json({
    message: "Associated item not found",
  });
}

/*
 * IMPORTANT:
 *
 * Admin claim review is only for items that are
 * currently held by the Lost & Found Department.
 *
 * Finder-held claims must be handled by the finder
 * through the normal claim workflow.
 */
if (item.itemLocation !== "lost-found-department") {
  return res.status(403).json({
    message:
      "This claim is not eligible for admin review because the item is not currently held by the Lost & Found Department.",
  });
}

// Keep normalized fields consistent.
if (!item.normalizedTitle) {
  item.normalizedTitle = item.title
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

if (!item.normalizedLocation) {
  item.normalizedLocation = item.location
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Make sure another claim has not already been approved.
const alreadyApproved = await Claim.findOne({
  item: item._id,
  status: "approved",
  _id: {
    $ne: claim._id,
  },
});

if (alreadyApproved) {
  return res.status(409).json({
    message:
      "Another claim for this item has already been approved",
  });
}

const cleanedReviewNote =
  typeof reviewNote === "string"
    ? reviewNote.trim()
    : "";

if (cleanedReviewNote.length > 500) {
  return res.status(400).json({
    message:
      "Review note cannot exceed 500 characters",
  });
}

/*
 * Update claim review information.
 */
claim.status = decision;
claim.reviewedBy = req.user._id;
claim.reviewNote = cleanedReviewNote;

/*
 * IMPORTANT:
 *
 * Approving the claim does NOT mean the item
 * has been physically returned.
 *
 * The item remains at the Lost & Found Department
 * until the admin actually hands it over to the owner.
 */
item.status = "active";
item.itemLocation = "lost-found-department";

await item.save();
await claim.save();

/*
 * Notify the claimant.
 */
await createNotification({
  recipient: claim.claimant,
  type:
    decision === "approved"
      ? "claim-approved"
      : "claim-rejected",
  title:
    decision === "approved"
      ? "Claim Approved"
      : "Claim Rejected",
  message:
    decision === "approved"
      ? "Your claim has been approved. Please visit the Lost & Found Department with your valid Sharda University ID to collect your item."
      : cleanedReviewNote ||
        "Your claim could not be verified based on the information provided.",
  item: item._id,
  claim: claim._id,
  io,
});

/*
 * Tell the admin dashboard to refresh
 * its case data in real time.
 */
if (io) {
  io.to("admins").emit("admin-case-updated", {
    type:
      decision === "approved"
        ? "claim-approved"
        : "claim-rejected",
    itemId: item._id,
    claimId: claim._id,
  });
}

const responseMessage =
  decision === "approved"
    ? "Claim approved successfully. The claimant has been notified."
    : "Claim rejected successfully. The claimant has been notified.";

return res.status(200).json({
  message: responseMessage,
  claim,
  item,
});


} catch (error) {
console.error("Review claim error:", error);


return res.status(500).json({
  message: "Unable to review claim",
  error: error.message,
});


}
};

const getAllHandovers = async (req, res) => {
try {
const filter = {};


if (req.query.status) {
  filter.status = req.query.status;
}

const handovers = await Handover.find(filter)
  .populate(
    "item",
    "title type category location images itemLocation status"
  )
  .populate("submittedBy", "name email")
  .populate("reviewedBy", "name email")
  .sort({ createdAt: -1 });

res.status(200).json({
  count: handovers.length,
  handovers,
});


} catch (error) {
console.error("Get all handovers error:", error);


res.status(500).json({
  message: "Unable to fetch handovers",
  error: error.message,
});


}
};

const reviewHandover = async (req, res) => {
try {
const io = req.app.get("io");
const { status, note } = req.body;


// Validate the requested status.
if (!["confirmed", "rejected"].includes(status)) {
  return res.status(400).json({
    message: "Status must be confirmed or rejected",
  });
}

// Find the handover.
const handover = await Handover.findById(
  req.params.handoverId
);

if (!handover) {
  return res.status(404).json({
    message: "Handover not found",
  });
}

// Only pending handovers can be reviewed.
if (handover.status !== "pending") {
  return res.status(400).json({
    message: "This handover has already been reviewed",
  });
}

// Find the associated item.
const item = await Item.findById(handover.item);

if (!item) {
  return res.status(404).json({
    message: "Associated item not found",
  });
}

// Make sure this is a valid lost/found item.
if (!["lost", "found"].includes(item.type)) {
  return res.status(400).json({
    message:
      "This item cannot be processed for department handover",
  });
}

/*
 * The item must still be with the finder when
 * the admin confirms the handover.
 */
if (
  status === "confirmed" &&
  item.itemLocation !== "with-finder"
) {
  return res.status(400).json({
    message:
      "This item is no longer with the finder, so the handover cannot be confirmed.",
  });
}

// Returned or closed items cannot be processed.
if (
  ["returned", "closed"].includes(item.status)
) {
  return res.status(400).json({
    message:
      "This item is no longer active and cannot be processed for department handover.",
  });
}

const cleanedNote = note?.trim() || "";

if (cleanedNote.length > 500) {
  return res.status(400).json({
    message:
      "Handover note cannot exceed 500 characters",
  });
}

// Record admin review.
handover.status = status;
handover.reviewedBy = req.user._id;
handover.reviewedAt = new Date();
handover.note = cleanedNote;

// Update physical location.
if (status === "confirmed") {
  item.itemLocation = "lost-found-department";
} else {
  item.itemLocation = "with-finder";
}

/*
 * Department handover does NOT mean the item
 * has been returned to its owner.
 */
item.status = "active";

await item.save();
await handover.save();

// Notify the student who submitted the handover.
await createNotification({
  recipient: handover.submittedBy,
  type:
    status === "confirmed"
      ? "handover-confirmed"
      : "handover-rejected",
  title:
    status === "confirmed"
      ? "Handover Confirmed"
      : "Handover Rejected",
  message:
    status === "confirmed"
      ? "The Lost & Found Department has confirmed receipt of the item."
      : "The Lost & Found Department could not confirm receipt of the item.",
  item: item._id,
  io,
});

// Refresh admin dashboard in real time.
if (io) {
  io.to("admins").emit("admin-case-updated", {
    type:
      status === "confirmed"
        ? "handover-confirmed"
        : "handover-rejected",
    itemId: item._id,
    handoverId: handover._id,
  });
}

return res.status(200).json({
  message:
    status === "confirmed"
      ? "Handover confirmed successfully"
      : "Handover rejected successfully",
  handover,
  item,
});


} catch (error) {
console.error(
"Review handover error:",
error
);


if (error.code === 11000) {
  return res.status(409).json({
    message:
      "This handover conflicts with an existing handover record.",
  });
}

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

if (error.name === "CastError") {
  return res.status(400).json({
    message:
      "Invalid handover or item identifier.",
  });
}

return res.status(500).json({
  message: "Unable to review handover",
});


}
};

const returnItemFromDepartment = async (
req,
res
) => {
try {
const io = req.app.get("io");
const { itemId } = req.params;


const item = await Item.findById(itemId);

if (!item) {
  return res.status(404).json({
    message: "Item not found",
  });
}

if (
  item.itemLocation !==
  "lost-found-department"
) {
  return res.status(400).json({
    message:
      "This item is not currently at the Lost & Found Department",
  });
}

if (item.status !== "active") {
  return res.status(400).json({
    message: "This item cannot be returned",
  });
}

const approvedClaim = await Claim.findOne({
  item: item._id,
  status: "approved",
});

if (!approvedClaim) {
  return res.status(400).json({
    message:
      "No approved claim exists for this item",
  });
}

if (item.departmentReturnedAt) {
  return res.status(400).json({
    message:
      "This item has already been returned",
  });
}

item.departmentReturnedTo =
  approvedClaim.claimant;

item.departmentReturnedBy =
  req.user._id;

item.departmentReturnedAt =
  new Date();

item.status = "returned";

await item.save();

await createNotification({
  recipient: approvedClaim.claimant,
  type: "item-returned",
  title: "Item Returned",
  message:
    "Your item has been handed over to you by the Lost & Found Department.",
  item: item._id,
  claim: approvedClaim._id,
  io,
});

return res.status(200).json({
  message:
    "Item returned to the owner successfully",
  item,
  claim: approvedClaim,
});


} catch (error) {
console.error(
"Return item from department error:",
error
);

if (error.name === "CastError") {
  return res.status(400).json({
    message: "Invalid item identifier",
  });
}

return res.status(500).json({
  message:
    "Unable to return item from department",
});


}
};

const getAllCases = async (req, res) => {
try {
const pendingHandovers =
await Handover.find({
status: "pending",
}).select("item");


const pendingClaims =
  await Claim.find({
    status: "pending",
  }).select("item");

const pendingHandoverItemIds =
  pendingHandovers.map(
    (handover) => handover.item
  );

const pendingClaimItemIds =
  pendingClaims.map(
    (claim) => claim.item
  );

const items = await Item.find({
  $or: [
    {
      itemLocation:
        "lost-found-department",
    },
    {
      departmentReturnedAt: {
        $ne: null,
      },
    },
    {
      _id: {
        $in: pendingHandoverItemIds,
      },
    },
    {
      _id: {
        $in: pendingClaimItemIds,
      },
    },
  ],
})
  .populate(
    "reportedBy",
    "name email"
  )
  .populate(
    "foundBy",
    "name email"
  )
  .populate(
    "departmentReturnedTo",
    "name email"
  )
  .populate(
    "departmentReturnedBy",
    "name email"
  )
  .sort({
    createdAt: -1,
  });

const cases = await Promise.all(
  items.map(async (item) => {
    const [
      handovers,
      claims,
    ] = await Promise.all([
      Handover.find({
        item: item._id,
      })
        .populate(
          "submittedBy",
          "name email"
        )
        .populate(
          "reviewedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        }),

      Claim.find({
        item: item._id,
      })
        .populate(
          "claimant",
          "name email"
        )
        .populate(
          "reviewedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        }),
    ]);

    const approvedClaim =
      claims.find(
        (claim) =>
          claim.status === "approved"
      ) || null;

    return {
      item,
      handovers,
      claims,
      approvedClaim,
    };
  })
);

return res.status(200).json({
  count: cases.length,
  cases,
});


} catch (error) {
console.error(
"Get all cases error:",
error
);


return res.status(500).json({
  message: "Unable to fetch cases",
});


}
};

const getCaseByItemId = async (
req,
res
) => {
try {
const { itemId } = req.params;

const item = await Item.findById(itemId)
  .populate(
    "reportedBy",
    "name email"
  )
  .populate(
    "foundBy",
    "name email"
  )
  .populate(
    "departmentReturnedTo",
    "name email"
  )
  .populate(
    "departmentReturnedBy",
    "name email"
  );

if (!item) {
  return res.status(404).json({
    message: "Item not found",
  });
}

const [
  handovers,
  claims,
] = await Promise.all([
  Handover.find({
    item: item._id,
  })
    .populate(
      "submittedBy",
      "name email"
    )
    .populate(
      "reviewedBy",
      "name email"
    )
    .sort({
      createdAt: -1,
    }),

  Claim.find({
    item: item._id,
  })
    .populate(
      "claimant",
      "name email"
    )
    .populate(
      "reviewedBy",
      "name email"
    )
    .sort({
      createdAt: -1,
    }),
]);

const approvedClaim =
  claims.find(
    (claim) =>
      claim.status === "approved"
  ) || null;

return res.status(200).json({
  case: {
    item,
    handovers,
    claims,
    approvedClaim,
  },
});


} catch (error) {
console.error(
"Get case by item ID error:",
error
);


if (error.name === "CastError") {
  return res.status(400).json({
    message:
      "Invalid item identifier",
  });
}

return res.status(500).json({
  message: "Unable to fetch case",
});


}
};

module.exports = {
getAllClaims,
reviewClaim,
reviewHandover,
getAllHandovers,
returnItemFromDepartment,
getAllCases,
getCaseByItemId,
};
