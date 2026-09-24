const express = require("express");

const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getMyNotifications);

router.patch(
  "/:notificationId/read",
  protect,
  markNotificationAsRead
);

router.patch(
  "/read-all",
  protect,
  markAllNotificationsAsRead
);

module.exports = router;