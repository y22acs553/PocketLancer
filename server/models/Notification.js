import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    type: {
      type: String,
      enum: [
        "booking_created",
        "booking_accepted",
        "booking_rejected",
        "general",
      ],
      default: "general",
    },

    link: { type: String, default: "" }, // where to go on click (ex: /bookings)
    isRead: { type: Boolean, default: false, index: true },

    meta: { type: Object, default: {} }, // optional extra info
  },
  { timestamps: true },
);

export default mongoose.model("Notification", NotificationSchema);
