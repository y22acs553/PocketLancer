import mongoose from "mongoose";

/**
 * GeoJSON Point Schema
 * MongoDB expects coordinates as [longitude, latitude]
 */
const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: function (coords) {
          if (!Array.isArray(coords) || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message: "Invalid longitude/latitude coordinates",
      },
    },
  },
  { _id: false },
);

const FreelancerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    skills: {
      type: [String],
      default: [],
    },
    profilePic: { type: String, default: "" },

    hourlyRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 🔴 GEO LOCATION (CORE FEATURE)
    location: {
      type: GeoPointSchema,
      required: false,
    },

    // Stored for UX / display only
    city: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

// 🚀 REQUIRED FOR GEO QUERIES
FreelancerSchema.index({ location: "2dsphere" });

const Freelancer = mongoose.model("Freelancer", FreelancerSchema);
export default Freelancer;
