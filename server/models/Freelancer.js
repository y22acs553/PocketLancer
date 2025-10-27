const mongoose = require("mongoose");

const FreelancerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  city: { type: String },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true, index: "2dsphere" },
  },
  skills: [String],
  portfolio: [String],
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  availability: { type: Object, default: {} },
});

module.exports = mongoose.model("Freelancer", FreelancerSchema);