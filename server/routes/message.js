import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Message, { makeConversationId } from "../models/Message.js";
import { protect } from "../middleware/auth.js";
const router = express.Router();
// Multer — memory storage, 5 MB limit for chat images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
// ─────────────────────────────────────────────────────────
// ⚠️  IMPORTANT: Static routes MUST come before /:otherUserId
// Otherwise Express catches /unread/count as a userId param
// ─────────────────────────────────────────────────────────
// GET /api/message/unread/count
router.get("/unread/count", protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user._id,
      readByReceiver: false,
    });
    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ msg: "Failed to count unread" });
  }
});
// GET /api/message/conversations/list
router.get("/conversations/list", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          unread: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", userId] },
                    { $eq: ["$readByReceiver", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      { $limit: 50 },
    ]);
    const User = (await import("../models/User.js")).default;
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const msg = conv.lastMessage;
        const partnerId =
          msg.senderId.toString() === userId.toString()
            ? msg.receiverId
            : msg.senderId;
        const partner = await User.findById(partnerId)
          .select("name profilePic")
          .lean();
        return {
          conversationId: conv._id,
          partner,
          lastMessage: msg,
          unreadCount: conv.unread,
        };
      }),
    );
    return res.json({ success: true, conversations: enriched });
  } catch (err) {
    console.error("LIST CONVERSATIONS ERROR:", err);
    return res.status(500).json({ msg: "Failed to list conversations" });
  }
});
// DELETE /api/message/conversation/:otherUserId — delete entire conversation
router.delete("/conversation/:otherUserId", protect, async (req, res) => {
  try {
    const conversationId = makeConversationId(
      req.user._id,
      req.params.otherUserId,
    );
    const result = await Message.deleteMany({ conversationId });
    // Notify the other user in real-time
    if (global.io) {
      global.io
        .to(req.params.otherUserId)
        .emit("conversation_deleted", { conversationId });
    }
    return res.json({
      success: true,
      msg: "Conversation deleted",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("DELETE CONVERSATION ERROR:", err);
    return res.status(500).json({ msg: "Failed to delete conversation" });
  }
});
router.delete("/:messageId", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ msg: "You can only delete your own messages" });
    }
    // Soft-delete: keep the document so conversation flow is preserved
    message.text = "";
    message.imageUrl = "";
    message.deleted = true;
    await message.save();
    // Notify receiver in real-time
    if (global.io) {
      global.io.to(message.receiverId.toString()).emit("message_deleted", {
        _id: message._id,
        conversationId: message.conversationId,
      });
    }
    return res.json({ success: true, msg: "Message deleted" });
  } catch (err) {
    console.error("DELETE MESSAGE ERROR:", err);
    return res.status(500).json({ msg: "Failed to delete message" });
  }
});
// GET /api/message/:otherUserId  ← dynamic route LAST
router.get("/:otherUserId", protect, async (req, res) => {
  try {
    const conversationId = makeConversationId(
      req.user._id,
      req.params.otherUserId,
    );
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    // Mark messages sent to current user as read
    await Message.updateMany(
      { conversationId, receiverId: req.user._id, readByReceiver: false },
      { readByReceiver: true },
    );
    return res.json({ success: true, messages });
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    return res.status(500).json({ msg: "Failed to fetch messages" });
  }
});
// POST /api/message/:otherUserId — send message (text and/or image)
router.post(
  "/:otherUserId",
  protect,
  upload.single("image"),
  async (req, res) => {
    const text = req.body.text?.trim() || "";
    let imageUrl = "";
    // Upload image to Cloudinary if present
    if (req.file) {
      try {
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        const result = await cloudinary.uploader.upload(base64, {
          folder: "pocketlancer/chat",
          transformation: [{ width: 800, quality: "auto" }],
        });
        imageUrl = result.secure_url;
      } catch (uploadErr) {
        console.error("CHAT IMAGE UPLOAD ERROR:", uploadErr);
        return res.status(500).json({ msg: "Failed to upload image" });
      }
    }
    if (!text && !imageUrl) {
      return res.status(400).json({ msg: "Message text or image is required" });
    }
    try {
      const senderId = req.user._id;
      const receiverId = req.params.otherUserId;
      const conversationId = makeConversationId(senderId, receiverId);
      const message = await Message.create({
        conversationId,
        senderId,
        receiverId,
        text,
        imageUrl,
      });
      const payload = {
        _id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        receiverId: message.receiverId,
        text: message.text,
        imageUrl: message.imageUrl,
        deleted: false,
        readByReceiver: false,
        createdAt: message.createdAt,
      };
      // ✅ Only emit to the RECEIVER — never the sender
      if (global.io) {
        global.io.to(receiverId.toString()).emit("new_message", payload);
      }
      return res.status(201).json({ success: true, message: payload });
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
      return res.status(500).json({ msg: "Failed to send message" });
    }
  },
);
export default router;
