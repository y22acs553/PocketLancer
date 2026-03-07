// server/utils/notify.js
// ─────────────────────────────────────────────────────────
// Saves Notification to DB, emits via socket.io, AND sends
// a Firebase Cloud Messaging push via firebase-admin V1 API.
//
// NEVER throws — notification failures must never break
// the calling request. Errors are logged silently.
// ─────────────────────────────────────────────────────────

import Notification from "../models/Notification.js";
import DeviceToken from "../models/DeviceToken.js";
import admin from "firebase-admin";

// ── Initialise Firebase Admin SDK once ───────────────────
// On Render: Environment → FIREBASE_SERVICE_ACCOUNT = <paste full JSON as one line>
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[FCM] Firebase Admin initialised ✓");
  } catch (err) {
    console.error(
      "[FCM] Firebase Admin init failed — push notifications disabled:",
      err.message,
    );
  }
}

// ── Friendly title map ────────────────────────────────────
const TITLES = {
  booking_created: "📋 New Booking Request",
  booking_confirmed: "✅ Booking Confirmed",
  booking_cancelled: "❌ Booking Cancelled",
  booking_rejected: "🚫 Booking Rejected",
  booking_completed: "🎉 Booking Completed",
  payment_released: "💰 Payment Update",
  payment_received: "💳 Payment Received",
  refund_initiated: "🔄 Refund Initiated",
  dispute_created: "⚠️ Dispute Raised",
  dispute_resolved: "🛡️ Dispute Resolved",
  freelancer_arrived: "📍 Freelancer Arrived",
  honor_score_changed: "⭐ Honor Score Updated",
  message_received: "💬 New Message",
  admin_message: "📣 Admin Notice",
};

// ── Send FCM push via V1 API ──────────────────────────────
async function sendFCMPush({ fcmToken, title, body, link }) {
  if (!admin.apps.length) return; // SDK not initialised — skip silently

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: {
        // Capacitor reads these in pushNotificationActionPerformed → navigates
        link: link || "/",
        title,
        body,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: { aps: { sound: "default" } },
      },
    });
  } catch (err) {
    // Stale / unregistered token — clean up so we stop retrying
    if (
      err.code === "messaging/registration-token-not-registered" ||
      err.code === "messaging/invalid-registration-token"
    ) {
      await DeviceToken.findOneAndDelete({ fcmToken }).catch(() => {});
      console.warn("[FCM] Removed stale token");
    } else {
      console.error("[FCM] Push error:", err.message);
    }
  }
}

// ── Main notify function ──────────────────────────────────
/**
 * @param {Object} opts
 * @param {string|ObjectId} opts.userId   - recipient
 * @param {string}          opts.type     - must match Notification enum
 * @param {string}          opts.message  - human-readable body
 * @param {string}          [opts.link]   - optional deep-link
 */
export const notify = async ({ userId, type, message, link = "" }) => {
  try {
    // 1. Persist to DB
    const notification = await Notification.create({
      user: userId,
      type,
      message,
      link,
    });

    const payload = {
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      link: notification.link,
      read: false,
      createdAt: notification.createdAt,
    };

    // 2. Real-time socket push (app open)
    if (global.io) {
      global.io.to(userId.toString()).emit("notification", payload);
    }

    // 3. FCM push (app closed / background) — fire and forget
    const deviceToken = await DeviceToken.findOne({ user: userId }).lean();
    if (deviceToken?.fcmToken) {
      sendFCMPush({
        fcmToken: deviceToken.fcmToken,
        title: TITLES[type] || "PocketLancer",
        body: message,
        link,
      });
    }

    return notification;
  } catch (err) {
    console.error(`[notify] Failed (${type} → ${userId}):`, err.message);
    return null;
  }
};
