import express from "express";
import mongoose from "mongoose";
import Freelancer from "../models/Freelancer.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

/* =====================================================
   UTILS
   ===================================================== */

function isValidCoordinates(latitude, longitude) {
  if (typeof latitude !== "number" || typeof longitude !== "number")
    return false;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

/* =====================================================
   FREELANCER SELF PROFILE
   ===================================================== */

router.get("/me", protect, authorize("freelancer"), async (req, res) => {
  try {
    let profile = await Freelancer.findOne({ user: req.user._id });

    // ✅ auto-create minimal profile (no location yet)
    if (!profile) {
      profile = await Freelancer.create({
        user: req.user._id,
        title: "",
        bio: "",
        skills: [],
        profilePic: "",
        hourlyRate: 0,
        city: "",
        country: "",
        category: "field", // default explicit
      });
    }

    return res.json({ success: true, profile });
  } catch (err) {
    console.error("❌ GET /me ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

router.put("/me", protect, authorize("freelancer"), async (req, res) => {
  try {
    const {
      title,
      bio,
      skills,
      hourlyRate,
      latitude,
      longitude,
      city,
      country,
      profilePic,
      portfolio,
      pastWorks,
      category,
    } = req.body;
    // ✅ Validate category
    if (category && !["field", "digital"].includes(category)) {
      return res.status(400).json({
        msg: "Invalid category",
      });
    }
    if (category === "digital") {
    }

    // ✅ enforce location mandatory when saving profile
    // ✅ Require location ONLY for field services
    if (
      (category === "field" || !category) &&
      !isValidCoordinates(latitude, longitude)
    ) {
      return res.status(400).json({
        msg: "Valid GPS location is required for field services",
      });
    }

    // Build update object safely
    const updateData = {
      title,
      bio,
      skills,
      hourlyRate,
      city,
      country,
      profilePic,
      portfolio,
      pastWorks,
      category,
    };

    if (category === "digital") {
      updateData.location = undefined;
    }

    if (category === "field" && isValidCoordinates(latitude, longitude)) {
      updateData.location = {
        type: "Point",
        coordinates: [longitude, latitude],
      };
    }

    const profile = await Freelancer.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, upsert: true },
    );

    return res.json({ success: true, profile });
  } catch (err) {
    console.error("❌ UPDATE PROFILE ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

/* =====================================================
   GEO + SKILLS SEARCH (SELF EXCLUDED)
   ===================================================== */

router.get("/search", protect, async (req, res) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const radiusKm = Number(req.query.radiusKm || 10);
    const category = String(req.query.category || "field");
    const skillsText = String(req.query.skills || "").trim();

    let freelancers = [];

    // ==============================
    // FIELD SERVICES SEARCH
    // ==============================
    if (category === "field") {
      if (!isValidCoordinates(latitude, longitude)) {
        return res.status(400).json({
          msg: "Valid latitude and longitude required",
        });
      }

      const geoQuery = {
        category: "field",
        location: { $exists: true },
        "location.coordinates.0": { $type: "number" },
        "location.coordinates.1": { $type: "number" },
      };

      if (skillsText) {
        const keywords = skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        geoQuery.$or = keywords.flatMap((word) => [
          { skills: { $elemMatch: { $regex: word, $options: "i" } } },
          { title: { $regex: word, $options: "i" } },
          { bio: { $regex: word, $options: "i" } },
        ]);
      }

      freelancers = await Freelancer.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distanceMeters",
            maxDistance: radiusKm * 1000,
            spherical: true,
            query: geoQuery,
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            title: 1,
            bio: 1,
            skills: 1,
            hourlyRate: 1,
            city: 1,
            country: 1,
            profilePic: 1,
            location: 1,
            category: 1,
            distanceKm: {
              $round: [{ $divide: ["$distanceMeters", 1000] }, 2],
            },
            user: {
              _id: "$user._id",
              name: "$user.name",
              email: "$user.email",
            },
          },
        },
      ]);
    }

    // ==============================
    // DIGITAL SERVICES SEARCH
    // ==============================
    else {
      const textQuery = { category: "digital" };

      if (skillsText) {
        const keywords = skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        textQuery.$or = keywords.flatMap((word) => [
          { skills: { $elemMatch: { $regex: word, $options: "i" } } },
          { title: { $regex: word, $options: "i" } },
          { bio: { $regex: word, $options: "i" } },
        ]);
      }

      freelancers = await Freelancer.find(textQuery)
        .limit(50)
        .populate("user", "name email")
        .select("title bio skills hourlyRate city country profilePic category");
    }

    // Exclude self
    freelancers = freelancers.filter(
      (f) => f.user?._id?.toString() !== req.user._id.toString(),
    );

    return res.json({ success: true, freelancers });
  } catch (err) {
    console.error("❌ SEARCH ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

/* =====================================================
   PUBLIC FREELANCER PROFILE
   ===================================================== */

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ msg: "Freelancer not found" });
    }

    const profile = await Freelancer.findById(id).populate("user", "name");

    if (!profile) {
      return res.status(404).json({ msg: "Freelancer not found" });
    }

    if (profile.category === "field") {
      const [lng, lat] = profile.location?.coordinates || [];

      if (!isValidCoordinates(lat, lng)) {
        return res.status(403).json({
          msg: "Freelancer profile is not active yet",
        });
      }
    }

    res.json({
      success: true,
      profile: {
        _id: profile._id,
        name: profile.user?.name,
        category: profile.category,
        title: profile.title,
        bio: profile.bio,
        skills: profile.skills,
        hourlyRate: profile.hourlyRate,
        city: profile.city,
        country: profile.country,
        profilePic: profile.profilePic || "",
        portfolio: profile.portfolio || [],
        pastWorks: profile.pastWorks || [],
      },
    });
  } catch (err) {
    console.error("❌ PUBLIC PROFILE ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

export default router;
