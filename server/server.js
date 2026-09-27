const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const claimRoutes = require("./routes/claimRoutes");
const adminRoutes = require("./routes/adminRoutes");
const messageRoutes = require("./routes/messageRoutes");
const handoverRoutes = require("./routes/handoverRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const socketAuthMiddleware = require("./middleware/socketAuthMiddleware");
const Conversation = require("./models/Conversation");

// Connect database
connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
  }),
);

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "ShardaFind API is running!",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/handovers", handoverRoutes);
app.use("/api/notifications", notificationRoutes);

// Create HTTP server
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
  },
});

// Socket authentication
io.use(socketAuthMiddleware);

// Socket connection
io.on("connection", (socket) => {
  console.log(
    "Socket connected:",
    socket.id,
    "User:",
    socket.user._id,
  );

  // Debug: check what user information
  // the socket authentication middleware provides
  console.log("Socket user:", socket.user);

  /*
   * PERSONAL USER ROOM
   *
   * Every authenticated user joins their own room.
   *
   * Example:
   * user:68abc123
   *
   * We use this room for personal notifications.
   */

  const userRoom = `user:${socket.user._id}`;

  socket.join(userRoom);

  console.log(
    `User ${socket.user._id} joined personal room ${userRoom}`,
  );

  /*
   * ADMIN DASHBOARD ROOM
   *
   * Every authenticated admin joins this room.
   *
   * We will later use this room to send
   * real-time case updates to the admin dashboard.
   */

  if (socket.user.role === "admin") {
    socket.join("admins");

    console.log(
      `Admin ${socket.user._id} joined admins room`,
    );
  }

  /*
   * JOIN CONVERSATION
   */

  socket.on(
    "join-conversation",
    async (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit("conversation-error", {
            message: "Conversation ID is required",
          });

          return;
        }

        const conversation =
          await Conversation.findById(conversationId);

        if (!conversation) {
          socket.emit("conversation-error", {
            message: "Conversation not found",
          });

          return;
        }

        /*
         * Make sure the user is actually
         * part of this conversation.
         */

        const isParticipant =
          conversation.participants.some(
            (participant) =>
              participant.toString() ===
              socket.user._id.toString(),
          );

        if (!isParticipant) {
          socket.emit("conversation-error", {
            message:
              "You are not part of this conversation",
          });

          return;
        }

        const roomName =
          `conversation:${conversationId}`;

        socket.join(roomName);

        console.log(
          `User ${socket.user._id} joined ${roomName}`,
        );

        socket.emit("conversation-joined", {
          conversationId,
        });
      } catch (error) {
        console.error(
          "Join conversation error:",
          error,
        );

        socket.emit("conversation-error", {
          message: "Unable to join conversation",
        });
      }
    },
  );

  /*
   * LEAVE CONVERSATION
   */

  socket.on(
    "leave-conversation",
    (conversationId) => {
      if (!conversationId) {
        return;
      }

      const roomName =
        `conversation:${conversationId}`;

      socket.leave(roomName);

      console.log(
        `User ${socket.user._id} left ${roomName}`,
      );
    },
  );

  /*
   * SOCKET DISCONNECTED
   */

  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id,
      "User:",
      socket.user._id,
    );
  });
});

/*
 * Make Socket.IO available inside
 * Express controllers.
 *
 * Controllers can now use:
 *
 * const io = req.app.get("io");
 */

app.set("io", io);

// Start server
server.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`,
  );
});