/**
 * ─────────────────────────────────────────────────────────
 * PocketLancer Chat Socket Handler
 * ─────────────────────────────────────────────────────────
 * HOW TO USE:
 *   Import and call this in your server's main file (index.js / server.js)
 *   after creating your Socket.io server:
 *
 *   import { registerChatSocket } from "./socket/chatSocket.js";
 *   registerChatSocket(io);
 * ─────────────────────────────────────────────────────────
 */
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Message, { makeConversationId } from "../models/Message.js";
// Map of userId -> socketId for online presence
const onlineUsers = new Map();
export function registerChatSocket(io) {
  // ── Auth middleware for socket connections ──────────────
  io.use(async (socket, next) => {
    try {
      // Token comes from cookie or handshake auth
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(";")
          .find((c) => c.trim().startsWith("token="))
          ?.split("=")[1];
      if (!token) return next(new Error("Not authenticated"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Auth failed"));
    }
  });
  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    onlineUsers.set(userId, socket.id);
    // Broadcast online status
    io.emit("user_online", { userId });
    // ── Join personal room ──────────────────────────────────
    socket.on("join", (uid) => {
      socket.join(String(uid));
    });
    // ── Join conversation room ──────────────────────────────
    socket.on("join_conversation", (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });
    // ── Send message ────────────────────────────────────────
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, text } = data;
        if (!text?.trim() || !receiverId) return;
        const conversationId = makeConversationId(userId, receiverId);
        // Create message with correct schema fields
        const message = await Message.create({
          conversationId,
          senderId: socket.user._id,
          receiverId,
          text: text.trim(),
        });
        // Emit plain object to both parties
        const plainMsg = {
          _id: String(message._id),
          conversationId: String(message.conversationId),
          senderId: String(message.senderId),
          receiverId: String(message.receiverId),
          text: message.text || "",
          readByReceiver: false,
          createdAt: message.createdAt,
        };
        // Emit message to receiver's personal room
        io.to(String(receiverId)).emit("new_message", plainMsg);
        // Also emit back to sender for confirmation
        socket.emit("new_message", plainMsg);
      } catch (err) {
        console.error("send_message error:", err);
        socket.emit("message_error", { msg: "Failed to send message" });
      }
    });
    // ── Typing indicators ───────────────────────────────────
    socket.on("typing_start", ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit("typing_start", {
        userId,
        name: socket.user.name,
      });
    });
    socket.on("typing_stop", ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit("typing_stop", { userId });
    });
    // ── Disconnect ──────────────────────────────────────────
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io.emit("user_offline", { userId });
    });
  });
}
export { onlineUsers };
