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

    // ⏱️ TIME MODEL (NEW)
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

    address: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// ⚡ SPEED UP CONFLICT CHECKS
BookingSchema.index({ freelancerId: 1, startTime: 1, endTime: 1 });

const Booking = mongoose.model("Booking", BookingSchema);
export default Booking;
