const express = require("express");
const {
  createItem,
  getItems,
  getMyItems,
  getItemById,
  reportFoundItem,
  confirmFinderHandover,
  confirmOwnerReceivedItem,
} = require("../controllers/itemController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");



const router = express.Router();

router.get("/", getItems);
router.get("/my-items", protect, getMyItems);
router.post("/", protect, upload.array("images", 3), createItem);
router.post(
  "/:id/report-found",
  protect,
  reportFoundItem
);

router.get("/:id", getItemById);

router.patch(
  "/:id/confirm-handover",
  protect,
  confirmFinderHandover
);

router.patch(
  "/:id/confirm-received",
  protect,
  confirmOwnerReceivedItem
);



module.exports = router;
