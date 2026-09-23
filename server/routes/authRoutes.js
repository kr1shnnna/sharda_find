const express = require("express");
const {
  registerUser,
  loginUser,
  getMyProfile,
  verifyEmail,
  resendOtp,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMyProfile);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOtp);

module.exports = router;
