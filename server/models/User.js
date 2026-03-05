import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },

    phone: { type: String, trim: true, default: "" },
    dateOfBirth: { type: Date, default: null },

    // ── Address ──────────────────────────────────────────
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },

    // ── Notification preferences ─────────────────────────
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },

    // ✅ Forgot password fields
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    role: {
      type: String,
      enum: ["client", "freelancer", "admin"],
      default: "client",
    },
  },
  { timestamps: true },
);

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model("User", UserSchema);
export default User;
