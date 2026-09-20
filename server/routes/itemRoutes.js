const express = require("express");
const {
  createItem,
  getItems,
  getMyItems,
  getItemById,
} = require("../controllers/itemController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getItems);
router.get("/my-items", protect, getMyItems);
router.post("/", protect, createItem);
router.get("/:id", getItemById);


module.exports = router;
