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
 * Socket.IO connection
 */
io.on("connection", (socket) => {
  console.log(
    "Socket connected:",
    socket.id
  );

  socket.on(
    "join-conversation",
    (conversationId) => {
      if (!conversationId) {
        return;
      }

      socket.join(
        `conversation:${conversationId}`
      );

      console.log(
        `Socket ${socket.id} joined conversation ${conversationId}`
      );
    }
  );

  socket.on(
    "leave-conversation",
    (conversationId) => {
      if (!conversationId) {
        return;
      }

      socket.leave(
        `conversation:${conversationId}`
      );

      console.log(
        `Socket ${socket.id} left conversation ${conversationId}`
      );
    }
  );

  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});

/*
 * Make Socket.IO available to controllers
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
