const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    claimant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownershipProof: {
      type: String,
      required: [true, "Ownership proof is required"],
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    evidenceImages: [
      {
        url: String,
        publicId: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Claim = mongoose.model("Claim", claimSchema);

module.exports = Claim;

