import mongoose from "mongoose";
const GeoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (c) => {
          if (!Array.isArray(c) || c.length !== 2) return false;
          const [lng, lat] = c;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message: "Invalid coordinates",
      },
    },
  },
  { _id: false },
);
const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);
const FreelancerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    title: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    skills: { type: [String], default: [] },
    profilePic: { type: String, default: "" },
    // ── Category ─────────────────────────────────────
    category: {
      type: String,
      enum: ["field", "digital"],
      default: "field",
    },
    // ── Pricing ──────────────────────────────────────
    pricingType: {
      type: String,
      enum: ["hourly", "fixed", "milestone"],
      default: "hourly",
    },
    /** hourlyRate — used when pricingType === "hourly" */
    hourlyRate: { type: Number, default: 0, min: 0 },
    /** fixedPrice — used when pricingType === "fixed" */
    fixedPrice: { type: Number, default: 0, min: 0 },
    /**
     * advanceAmount — DIGITAL HOURLY only.
     * When a client doesn't know how many hours the work will take,
     * they pay this advance amount upfront. The rest is settled after work.
     * Freelancer sets this on their profile.
     */
    advanceAmount: { type: Number, default: 0, min: 0 },
    milestones: { type: [MilestoneSchema], default: [] },
    // ── Location (field workers only) ────────────────
    location: { type: GeoPointSchema, required: false },
    city: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    // ── Portfolio ─────────────────────────────────────
    portfolio: { type: [String], default: [] },
    pastWorks: { type: mongoose.Schema.Types.Mixed, default: [] },
    // ── Stats ─────────────────────────────────────────
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },
    // ── Bank Details (digital freelancers) ────────────
    bankDetails: {
      accountHolder: { type: String, trim: true, default: "" },
      accountNumber: { type: String, trim: true, default: "" },
      ifscCode: { type: String, trim: true, default: "" },
      bankName: { type: String, trim: true, default: "" },
      upiId: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true },
);
FreelancerSchema.index({ location: "2dsphere" });
export default mongoose.model("Freelancer", FreelancerSchema);
