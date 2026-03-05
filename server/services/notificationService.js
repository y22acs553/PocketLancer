// server/services/notificationService.js
import { notify } from "../utils/notify.js";

// ── Bookings ───────────────────────────────────────────────────────

export async function sendBookingCreated(
  freelancerUserId,
  bookingId,
  meta = {},
) {
  return notify({
    userId: freelancerUserId,
    type: "booking_created",
    message: meta.serviceType
      ? `New booking request for "${meta.serviceType}"${meta.date ? ` on ${meta.date}` : ""}`
      : "You have a new booking request",
    link: `/freelancer/bookings`,
  });
}

export async function sendBookingConfirmed(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_confirmed",
    message: meta.serviceType
      ? `Your "${meta.serviceType}" booking has been confirmed`
      : "Your booking has been confirmed",
    link: `/bookings/${bookingId}`,
  });
}

export async function sendBookingCompleted(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_completed",
    message: meta.serviceType
      ? `"${meta.serviceType}" has been marked complete. Leave a review!`
      : "Your booking has been completed. Leave a review!",
    link: `/bookings/${bookingId}`,
  });
}

export async function sendBookingCancelled(clientId, bookingId, meta = {}) {
  return notify({
    userId: clientId,
    type: "booking_cancelled",
    message: meta.serviceType
      ? `Your "${meta.serviceType}" booking was cancelled`
      : "Your booking has been cancelled",
    link: `/bookings/${bookingId}`,
  });
}

// ── Disputes ──────────────────────────────────────────────────────

export async function sendDisputeCreated(userId, disputeId) {
  return notify({
    userId,
    type: "dispute_created",
    message:
      "A dispute has been raised on one of your bookings. Our team will review it shortly.",
    link: `/disputes/${disputeId}`,
  });
}

export async function sendDisputeResolved(userId, resolution) {
  const msg =
    resolution === "refund_to_client"
      ? "Your dispute was resolved — a refund has been issued."
      : resolution === "release_to_freelancer"
        ? "Your dispute was resolved — payment released to the freelancer."
        : "Your dispute was resolved with a 50/50 split.";

  return notify({
    userId,
    type: "dispute_resolved",
    message: msg,
    link: "/bookings",
  });
}

// ── Auth ──────────────────────────────────────────────────────────

export async function sendPasswordReset(userId) {
  return notify({
    userId,
    type: "password_reset",
    message: "Your password has been reset successfully.",
    link: "/login",
  });
}

// ── Admin ─────────────────────────────────────────────────────────

export async function sendAdminMessage(userId, message) {
  return notify({ userId, type: "admin_message", message, link: "/dashboard" });
}

// ── Payments ──────────────────────────────────────────────────────

export async function sendPaymentReleased(userId, amount, serviceType) {
  return notify({
    userId,
    type: "payment_released",
    message: `₹${amount.toLocaleString("en-IN")} released for "${serviceType}"`,
    link: "/bookings",
  });
}

export async function sendPaymentReceived(userId, amount, serviceType) {
  return notify({
    userId,
    type: "payment_released",
    message: `₹${amount.toLocaleString("en-IN")} received for "${serviceType}"`,
    link: "/freelancer/bookings",
  });
}
