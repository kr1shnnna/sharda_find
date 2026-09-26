const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  item = null,
  claim = null,
  conversation = null,
  io = null,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      item,
      claim,
      conversation,
    });

    // Send the notification in real time
    if (io) {
      const userRoom = `user:${recipient}`;

      io.to(userRoom).emit("new-notification", {
        notification,
      });
    }

    return notification;
  } catch (error) {
    console.error("Create notification error:", error);

    return null;
  }
};

module.exports = createNotification;
