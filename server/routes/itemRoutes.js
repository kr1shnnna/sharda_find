const express = require("express");
const {
  createItem,
  getItems,
  getMyItems,
  getItemById,
} = require("../controllers/itemController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");



const router = express.Router();

router.get("/", getItems);
router.get("/my-items", protect, getMyItems);
router.post("/", protect, upload.array("images", 3), createItem);
router.get("/:id", getItemById);


module.exports = router;
