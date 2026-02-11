import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      required: true,
    },

    serviceType: {
      type: String,
      required: true,
      trim: true,
    },

    issueDescription: {
      type: String,
      trim: true,
      default: "",
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    estimatedDurationMinutes: {
      type: Number,
      required: true,
    },

    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "disputed"],
      default: "pending",
    },

    // ✅ NEW — LOCK BOOKING WHEN DISPUTED
    disputeLocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

BookingSchema.index({ freelancerId: 1, startTime: 1, endTime: 1 });

const Booking = mongoose.model("Booking", BookingSchema);
export default Booking;
