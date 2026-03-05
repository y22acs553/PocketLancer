import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        // Bookings
        "booking_created", // freelancer: new request
        "booking_confirmed", // client: freelancer accepted
        "booking_cancelled", // client: freelancer rejected
        "booking_completed", // client: job marked done
        // Disputes
        "dispute_created", // both parties + admins
        "dispute_resolved", // both parties after admin resolves
        // Auth
        "password_reset", // user: password changed
        // Admin
        "admin_message", // any user: message from admin
        // Payments (Razorpay — stubbed)
        "payment_released", // client/freelancer: money moved
        // Legacy / misc
        "review_received",
        "profile_updated",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
      maxlength: 300,
    },

    link: {
      type: String,
      default: "",
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

// TTL index: auto-delete notifications older than 90 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

export default mongoose.model("Notification", notificationSchema);
