import mongoose from "mongoose";

/**
 * Booking Milestone
 * Copied from freelancer's template at booking creation.
 * Each milestone is paid independently via escrow.
 */
const BookingMilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    amount: { type: Number, required: true }, // ₹ for this milestone
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "submitted", "approved", "released"],
      default: "pending",
    },
    razorpayPaymentId: { type: String, default: "" },
    releasedAt: { type: Date },
  },
  { _id: true },
);

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

    serviceType: { type: String, required: true, trim: true },
    issueDescription: { type: String, trim: true, default: "" },

    // ── Service category snapshot ──────────────────────
    /**
     * "digital" → paid via escrow at booking time
     * "field"   → paid in cash/UPI at the site
     */
    serviceCategory: {
      type: String,
      enum: ["field", "digital"],
      default: "field",
    },

    // ── Schedule (required for field, optional/auto for digital) ──
    startTime: { type: Date, required: false },
    endTime: { type: Date, required: false },
    estimatedDurationMinutes: { type: Number, default: 60 },

    preferredDate: { type: String, default: "" },
    preferredTime: { type: String, default: "" },

    // ── Location (required for field, N/A for digital) ───────────
    address: { type: String, trim: true, default: "" },

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "pending",
    },

    disputeLocked: { type: Boolean, default: false },

    // ── Pricing snapshot ────────────────────────────────────────
    pricingType: {
      type: String,
      enum: ["hourly", "fixed", "milestone"],
      default: "hourly",
    },

    /** Total agreed price (₹). For hourly-field, estimated. */
    agreedAmount: { type: Number, default: 0 },

    /** For milestone bookings — copied from freelancer profile */
    milestones: { type: [BookingMilestoneSchema], default: [] },

    // ── Payment / Escrow ─────────────────────────────────────────
    /**
     * DIGITAL FLOW:
     *   unpaid → pending → held → released / refunded / partial_refund
     *
     * FIELD FLOW:
     *   field_pending (no online payment; paid at site)
     *   field_paid (marked after on-site payment)
     */
    paymentStatus: {
      type: String,
      enum: [
        "unpaid", // digital: client hasn't paid yet
        "pending", // digital: Razorpay order created
        "held", // digital: escrow active
        "partially_released", // digital: some milestones released
        "released", // digital: full amount released to freelancer
        "refunded", // digital: full refund to client
        "partial_refund", // digital: split after dispute
        "field_pending", // field: awaiting on-site payment
        "field_paid", // field: paid at location
      ],
      default: "unpaid",
    },

    /** Razorpay order ID created when client initiates payment */
    razorpayOrderId: { type: String, default: "" },

    /** Razorpay payment ID after successful capture */
    razorpayPaymentId: { type: String, default: "" },

    /** Total amount paid into escrow (₹, not paise) */
    escrowAmount: { type: Number, default: 0 },

    releasedAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },
    razorpayRefundId: { type: String, default: "" },

    paidAt: { type: Date },
    releasedAt: { type: Date },
    refundedAt: { type: Date },

    /** Auto-release timer — if client doesn't act within N days after completion */
    autoReleaseAt: { type: Date },
  },
  { timestamps: true },
);

BookingSchema.index({ freelancerId: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ clientId: 1, status: 1 });
BookingSchema.index({ razorpayOrderId: 1 });
BookingSchema.index({ autoReleaseAt: 1 }); // for cron job

export default mongoose.model("Booking", BookingSchema);
