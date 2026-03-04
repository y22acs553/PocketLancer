import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "booking_created",
        "booking_accepted",
        "booking_completed",
        "payment_released",
        "profile_updated",
        "review_received",
      ],
    },

    message: String,

    link: String, // optional redirect

    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
