const jwt = require("jsonwebtoken");

const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(
        new Error("Authentication required")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.user = {
      _id: decoded.id || decoded.userId,
      role: decoded.role,
    };

    if (!socket.user._id) {
      return next(
        new Error("Invalid authentication token")
      );
    }

    next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error
    );

    next(
      new Error("Invalid or expired token")
    );
  }
};

module.exports = socketAuthMiddleware;