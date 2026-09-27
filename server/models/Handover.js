const mongoose = require("mongoose");

const handoverSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: [true, "Item is required"],
      index: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Submitter is required"],
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ["pending", "confirmed", "rejected"],
        message:
          "Handover status must be pending, confirmed, or rejected",
      },
      default: "pending",
      required: true,
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [
        500,
        "Handover note cannot exceed 500 characters",
      ],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Prevent more than one pending handover
 * for the same item.
 *
 * Confirmed and rejected handovers are still
 * allowed as historical records.
 */
handoverSchema.index(
  { item: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
    name: "unique_pending_handover_per_item",
  }
);

/*
 * Useful when retrieving the handover history
 * of a particular item.
 */
handoverSchema.index({
  item: 1,
  createdAt: -1,
});

/*
 * Useful for the admin dashboard when filtering
 * handovers by status.
 */
handoverSchema.index({
  status: 1,
  createdAt: -1,
});

const Handover = mongoose.model(
  "Handover",
  handoverSchema
);

module.exports = Handover;
