const express = require("express");
const {
  registerUser,
  loginUser,
  getMyProfile,
  verifyEmail,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMyProfile);
router.post("/verify-email", verifyEmail);

module.exports = router;
