/**
 * notify.js
 * ─────────────────────────────────────────────────────────
 * Low-level helper: saves a Notification to DB and emits
 * it via socket.io to the target user's room.
 *
 * NEVER throws — notification failures must never break
 * the calling request. Errors are logged silently.
 * ─────────────────────────────────────────────────────────
 */

import Notification from "../models/Notification.js";

/**
 * @param {Object} opts
 * @param {string|ObjectId} opts.userId   - recipient
 * @param {string}          opts.type     - must match Notification enum
 * @param {string}          opts.message  - human-readable text
 * @param {string}          [opts.link]   - optional deep-link
 * @returns {Promise<Notification|null>}
 */
export const notify = async ({ userId, type, message, link = "" }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      message,
      link,
    });

    // Emit real-time update if socket server is running
    if (global.io) {
      global.io.to(userId.toString()).emit("notification", {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (err) {
    // Log but never re-throw — a notification failure must never
    // break the booking/dispute/auth flow that triggered it
    console.error(
      `[notify] Failed to create notification (${type} → ${userId}):`,
      err.message,
    );
    return null;
  }
};
