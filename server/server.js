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

const socketAuthMiddleware = require(
  "./middleware/socketAuthMiddleware"
);

const Conversation = require(
  "./models/Conversation"
);

connectDB();

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "ShardaFind API is running!",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/items", itemRoutes);

app.use("/api/claims", claimRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/handovers", handoverRoutes);

app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

/*
 * Create HTTP server
 */

const server = http.createServer(app);

/*
 * Create Socket.IO server
 */

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

/*
 * Socket authentication
 */

io.use(socketAuthMiddleware);

/*
 * Socket.IO connection
 */

io.on("connection", (socket) => {
  console.log(
    "Socket connected:",
    socket.id,
    "User:",
    socket.user._id
  );

  /*
   * Join conversation
   */

  socket.on(
    "join-conversation",
    async (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit("conversation-error", {
            message:
              "Conversation ID is required",
          });

          return;
        }

        /*
         * Find conversation
         */

        const conversation =
          await Conversation.findById(
            conversationId
          );

        if (!conversation) {
          socket.emit("conversation-error", {
            message:
              "Conversation not found",
          });

          return;
        }

        /*
         * Check whether the authenticated
         * user is a participant
         */

        const isParticipant =
          conversation.participants.some(
            (participant) =>
              participant.toString() ===
              socket.user._id.toString()
          );

        if (!isParticipant) {
          socket.emit("conversation-error", {
            message:
              "You are not part of this conversation",
          });

          return;
        }

        /*
         * Create conversation room
         */

        const roomName =
          `conversation:${conversationId}`;

        /*
         * Join room
         */

        socket.join(roomName);

        console.log(
          `User ${socket.user._id} joined ${roomName}`
        );

        /*
         * Tell client that joining succeeded
         */

        socket.emit(
          "conversation-joined",
          {
            conversationId,
          }
        );
      } catch (error) {
        console.error(
          "Join conversation error:",
          error
        );

        socket.emit("conversation-error", {
          message:
            "Unable to join conversation",
        });
      }
    }
  );

  /*
   * Leave conversation
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
        `User ${socket.user._id} left ${roomName}`
      );
    }
  );

  /*
   * Socket disconnected
   */

  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id,
      "User:",
      socket.user._id
    );
  });
});

/*
 * Make Socket.IO available
 * inside Express controllers
 */

app.set("io", io);

/*
 * Start server
 */

server.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`
  );
});
