const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  item = null,
  claim = null,
  conversation = null,
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

    return notification;
  } catch (error) {
    console.error("Create notification error:", error);

    return null;
  }
};

module.exports = createNotification;
