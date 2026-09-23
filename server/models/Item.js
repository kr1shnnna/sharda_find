const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Item title is required"],
      trim: true,
    },

    normalizedTitle: {
      type: String,
      required: true,
    },
    normalizedLocation: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["lost", "found"],
      required: [true, "Item type is required"],
    },
    category: {
      type: String,
      enum: [
        "electronics",
        "id-card",
        "documents",
        "keys",
        "wallet",
        "bag",
        "bottle",
        "clothing",
        "accessories",
        "other",
      ],
      required: [true, "Item category is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    itemDate: {
      type: Date,
      required: [true, "Date is required"],
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    returnMethod: {
      type: String,
      enum: ["direct-return", "lost-found-department"],
      default: "lost-found-department",
    },

    itemLocation: {
      type: String,
      enum: ["with-finder", "lost-found-department"],
      default: null,
    },

    pickupLocation: {
      type: String,
      default: "Lost & Found Department",
    },
    status: {
      type: String,
      enum: ["active", "claim-pending", "returned", "closed"],
      default: "active",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    foundBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
