// ======================================================
// 1️⃣ LOAD ENVIRONMENT VARIABLES (FIRST)
// ======================================================
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

// ======================================================
// 2️⃣ ESM PATH HELPERS
// ======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// 3️⃣ ENV VALIDATION (FAIL FAST)
// ======================================================
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is missing from .env");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is missing from .env");
  process.exit(1);
}

// ======================================================
// 4️⃣ LOCAL IMPORTS
// ======================================================
import connectDB from "./config/db.mjs";

// Routes
import authRoutes from "./routes/auth.js";
import freelancerRoutes from "./routes/freelancers.js";
import bookingRoutes from "./routes/bookings.js";
import clientRoutes from "./routes/client.js";
import reviewRoutes from "./routes/reviews.js";
import uploadRoutes from "./routes/uploads.js";
import notificationRoutes from "./routes/notifications.js";
import adminRoutes from "./routes/admin.js";
import disputeRoutes from "./routes/disputes.js";
import profileRoutes from "./routes/profile.js";
import portfolioRoutes from "./routes/portfolio.js";
import chatRoutes from "./routes/chat.js"; // ✅ Chat routes
import { registerChatSocket } from "./socket/chatSocket.js"; // ✅ Chat socket
import paymentsRouter from "./routes/payments.js";
import messageRouter from "./routes/message.js";

import "./jobs/disputeSLA.js";

// ======================================================
// 5️⃣ APP & DB INIT
// ======================================================
const app = express();
const PORT = process.env.PORT || 5001;

connectDB();

// ======================================================
// 6️⃣ GLOBAL MIDDLEWARE
// ======================================================
const allowedOrigins = [
  "http://localhost:3000",
  "https://www.pocketlancer.org",
  "https://pocketlancer.org",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());

// ======================================================
// 7️⃣ ROUTES
// ======================================================
app.use("/api/auth", authRoutes);
app.use("/api/freelancers", freelancerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/chat", chatRoutes); // ✅ Chat REST API
app.use("/api/payments", paymentsRouter);
app.use("/api/message", messageRouter);

// ======================================================
// 8️⃣ HEALTH CHECK
// ======================================================
app.get("/", (req, res) => {
  res.status(200).send("PocketLancer API is healthy 🚀");
});

// ======================================================
// 9️⃣ GLOBAL ERROR HANDLER
// ======================================================
app.use((err, req, res, next) => {
  console.error("❌ UNHANDLED ERROR:", err);
  res.status(500).json({ msg: "Internal server error" });
});

// ======================================================
// 🔟 START SERVER WITH SOCKET.IO
// ======================================================
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// ✅ Existing notification socket (join room by userId)
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log("🔔 User joined notification room:", userId);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// ✅ Chat socket (handles all chat events — send, typing, presence)
registerChatSocket(io);

global.io = io;

httpServer.listen(PORT, () => {
  console.log(`🚀 PocketLancer server running on port ${PORT}`);
});
