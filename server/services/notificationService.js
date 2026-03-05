/**
 * notificationService.js
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for every in-app notification the platform
 * sends. Import named helpers wherever you need them — never call
 * notify() directly from routes.
 *
 * Each helper is fire-and-forget safe: errors are logged but never
 * re-thrown so a notification failure never breaks a request.
 * ─────────────────────────────────────────────────────────────────
 */

import { notify } from "../utils/notify.js";

// ── Booking ───────────────────────────────────────────────────────

/** Freelancer receives: a new booking request arrived */
export async function sendBookingCreated(
  freelancerUserId,
  bookingId,
  meta = {},
) {
  return notify({
    userId: freelancerUserId,
    type: "booking_created",
    message: meta.serviceType
      ? `New booking request for "${meta.serviceType}" on ${meta.date || "a scheduled date"}`
      : "You have a new booking request",
    link: `/freelancer/bookings`,
  });
}

/** Client receives: freelancer confirmed their booking */
export async function sendBookingConfirmed(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_confirmed",
    message: meta.serviceType
      ? `Your "${meta.serviceType}" booking has been confirmed`
      : "Your booking has been confirmed",
    link: `/bookings`,
  });
}

/** Client receives: freelancer marked job complete */
export async function sendBookingCompleted(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_completed",
    message: meta.serviceType
      ? `"${meta.serviceType}" has been marked as completed. Leave a review!`
      : "Your booking has been completed. Leave a review!",
    link: `/bookings`,
  });
}

/** Client receives: freelancer cancelled/rejected the booking */
export async function sendBookingCancelled(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_cancelled",
    message: meta.serviceType
      ? `Your "${meta.serviceType}" booking was cancelled`
      : "Your booking has been cancelled",
    link: `/bookings`,
  });
}

// ── Disputes ──────────────────────────────────────────────────────

/** Notify a user that a dispute has been raised on their booking */
export async function sendDisputeCreated(userId, disputeId) {
  return notify({
    userId,
    type: "dispute_created",
    message:
      "A dispute has been raised on one of your bookings. Our team will review it shortly.",
    link: `/bookings`,
  });
}

/** Notify both parties when admin resolves a dispute */
export async function sendDisputeResolved(userId, resolution) {
  const outcomeText =
    resolution === "refund_to_client"
      ? "A refund has been issued to the client"
      : "Payment has been released to the freelancer";

  return notify({
    userId,
    type: "dispute_resolved",
    message: `Your dispute has been resolved. ${outcomeText}.`,
    link: `/bookings`,
  });
}

// ── Auth ──────────────────────────────────────────────────────────

/** User receives: their password was just reset */
export async function sendPasswordReset(userId) {
  return notify({
    userId,
    type: "password_reset",
    message:
      "Your password was reset successfully. If this wasn't you, contact support immediately.",
    link: `/`,
  });
}

// ── Admin messages ────────────────────────────────────────────────

/** Admin sends a custom message to any user */
export async function sendAdminMessage(userId, message, link = "/") {
  return notify({
    userId,
    type: "admin_message",
    message,
    link,
  });
}

// ── Payments (stub — ready for Razorpay) ─────────────────────────

/** Client receives: payment was released to freelancer */
export async function sendPaymentReleased(clientId, meta = {}) {
  return notify({
    userId: clientId,
    type: "payment_released",
    message: meta.amount
      ? `Payment of ₹${meta.amount} released to your freelancer`
      : "Payment has been released",
    link: `/bookings`,
  });
}

/** Freelancer receives: payment incoming */
export async function sendPaymentReceived(freelancerUserId, meta = {}) {
  return notify({
    userId: freelancerUserId,
    type: "payment_released",
    message: meta.amount
      ? `You received a payment of ₹${meta.amount}`
      : "You have received a payment",
    link: `/freelancer/bookings`,
  });
}
