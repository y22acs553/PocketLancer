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
        // location intentionally not set here
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
    } = req.body;

    // ✅ enforce location mandatory when saving profile
    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        msg: "Valid GPS location is required",
      });
    }

    const profile = await Freelancer.findOneAndUpdate(
      { user: req.user._id },
      {
        title,
        bio,
        skills,
        hourlyRate,
        city,
        country,
        profilePic,
        portfolio,
        pastWorks,
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
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

    const skillsQuery = req.query.skills
      ? req.query.skills
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];

    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        msg: "Valid latitude and longitude required",
      });
    }

    // ✅ Only show freelancers who have real location
    const geoQuery = {
      "location.coordinates.0": { $exists: true },
      "location.coordinates.1": { $exists: true },
    };

    if (skillsQuery.length > 0) {
      geoQuery.skills = { $in: skillsQuery };
    }

    const freelancers = await Freelancer.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distanceMeters",
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: geoQuery,
        },
      },
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
          distanceKm: {
            $round: [{ $divide: ["$distanceMeters", 1000] }, 2],
          },
          userId: "$user._id",
          userName: "$user.name",
        },
      },
    ]);

    // ✅ exclude self
    const filtered = freelancers.filter(
      (f) => f.userId.toString() !== req.user._id.toString(),
    );

    return res.json({ success: true, freelancers: filtered });
  } catch (err) {
    console.error("❌ GEO SEARCH ERROR:", err);
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

    const [lng, lat] = profile.location?.coordinates || [];

    if (!isValidCoordinates(lat, lng)) {
      return res.status(403).json({
        msg: "Freelancer profile is not active yet",
      });
    }

    res.json({
      success: true,
      profile: {
        id: profile._id,
        name: profile.user?.name,
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
