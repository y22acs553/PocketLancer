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
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

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
        const { conversationId, text, image } = data;

        if (!text?.trim() && !image) return;

        // Security: verify sender is a participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => String(p) === userId,
        );
        if (!isParticipant) return;

        // Create message
        const message = await Message.create({
          conversationId,
          sender: socket.user._id,
          text: text?.trim() || "",
          image: image || "",
          readBy: [socket.user._id],
        });

        const populated = await message.populate("sender", "name avatar role");

        // ✅ Emit plain object — Mongoose documents can serialize ObjectIds inconsistently
        const plainMsg = {
          _id: String(message._id),
          conversationId: String(message.conversationId),
          sender: {
            _id: String(populated.sender._id),
            name: populated.sender.name,
            avatar: populated.sender.avatar || "",
            role: populated.sender.role,
          },
          text: message.text || "",
          image: message.image || "",
          createdAt: message.createdAt,
          readBy: [],
        };

        // Update conversation metadata
        const otherParticipants = conversation.participants.filter(
          (p) => String(p) !== userId,
        );

        // Increment unread for other participants — use $inc to avoid Map issues
        const unreadInc = {};
        for (const otherId of otherParticipants) {
          unreadInc[`unreadCount.${String(otherId)}`] = 1;
        }
        await Conversation.updateOne(
          { _id: conversationId },
          {
            $set: {
              lastMessage: text?.trim() || "📷 Image",
              lastMessageAt: new Date(),
            },
            $inc: unreadInc,
          },
        );

        // Emit message to everyone in conversation room
        io.to(`conv_${conversationId}`).emit("new_message", plainMsg);

        // Notify offline participants via their personal room
        for (const otherId of otherParticipants) {
          io.to(String(otherId)).emit("chat_notification", {
            conversationId,
            senderId: userId,
            senderName: socket.user.name,
            preview: text?.trim() || "📷 Image",
          });
        }
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
