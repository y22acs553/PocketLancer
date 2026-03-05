import express from "express";
import Message, { makeConversationId } from "../models/Message.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

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

// POST /api/message/:otherUserId
router.post("/:otherUserId", protect, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ msg: "Message text is required" });
  }

  try {
    const senderId = req.user._id;
    const receiverId = req.params.otherUserId;
    const conversationId = makeConversationId(senderId, receiverId);

    const message = await Message.create({
      conversationId,
      senderId,
      receiverId,
      text: text.trim(),
    });

    const payload = {
      _id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      text: message.text,
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
});

export default router;
