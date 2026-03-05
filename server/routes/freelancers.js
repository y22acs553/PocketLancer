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

/**
 * getSearchVariants — Fuzzy / stem-aware search patterns
 *
 * For a query like "plumber", we want to also match "plumbing", "plumb".
 * Strategy: strip common English suffixes to get the root, then search
 * both the original word and the root with a partial-prefix regex.
 *
 * Examples:
 *   plumber  → ["plumber", "plumb"]   → /plumb/i matches "plumbing","plumber"
 *   plumbing → ["plumbing", "plumb"]  → /plumb/i
 *   electrician → ["electric"]
 *   electrical  → ["electric"]
 *   developer  → ["develop"]
 *   designing  → ["design"]
 */
function getSearchVariants(word) {
  const w = word.toLowerCase().trim();
  if (!w) return [];

  const variants = new Set([w]);

  // Strip common suffixes (order matters — longest first)
  const suffixes = [
    "ician", // electrician → electric
    "ation", // installation → install
    "ting", // installing → install (after -ting → remove 'ting', keep stem)
    "ling", // travelling
    "ing", // plumbing → plumb, designing → design
    "tion", // installation → installa
    "sion", // extension
    "ness",
    "ment",
    "ance",
    "ence",
    "ity",
    "ive",
    "ical", // electrical → electr
    "ical",
    "al",
    "er", // plumber → plumb, developer → develop
    "or", // contractor → contract
    "eur",
    "ist", // pianist → pian
    "ian", // technician → technic
    "ed", // skilled
    "ly",
    "ry", // carpentry → carpent
    "ery",
  ];

  for (const suffix of suffixes) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      variants.add(w.slice(0, w.length - suffix.length));
    }
  }

  return Array.from(variants);
}

/**
 * Build $or query for a set of skill search terms.
 * Each word gets expanded into stem variants, each variant becomes a
 * prefix-based regex so "plumb" matches "plumbing", "plumber" etc.
 */
function buildSkillQuery(skillsText) {
  const keywords = skillsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const orClauses = [];

  for (const keyword of keywords) {
    const variants = getSearchVariants(keyword);

    for (const variant of variants) {
      // Use word-start match when variant is a short stem (avoid false hits)
      const regexStr =
        variant.length <= 4
          ? `^${variant}` // short stems: anchor to start of word
          : variant; // longer stems: anywhere in the field

      const regex = { $regex: regexStr, $options: "i" };

      orClauses.push(
        { skills: { $elemMatch: regex } },
        { title: regex },
        { bio: regex },
      );
    }
  }

  return orClauses.length ? { $or: orClauses } : {};
}

/* =====================================================
   FREELANCER SELF PROFILE
   ===================================================== */

router.get("/me", protect, authorize("freelancer"), async (req, res) => {
  try {
    let profile = await Freelancer.findOne({ user: req.user._id });

    if (!profile) {
      profile = await Freelancer.create({
        user: req.user._id,
        title: "",
        bio: "",
        skills: [],
        profilePic: "",
        hourlyRate: 0,
        advanceAmount: 0,
        city: "",
        country: "",
        category: "field",
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
      fixedPrice,
      advanceAmount,
      pricingType,
      milestones,
      latitude,
      longitude,
      city,
      country,
      profilePic,
      portfolio,
      pastWorks,
      category,
    } = req.body;

    if (category && !["field", "digital"].includes(category)) {
      return res.status(400).json({ msg: "Invalid category" });
    }

    if (
      (category === "field" || !category) &&
      !isValidCoordinates(latitude, longitude)
    ) {
      return res.status(400).json({
        msg: "Valid GPS location is required for field services",
      });
    }

    const updateData = {
      title,
      bio,
      skills,
      hourlyRate,
      fixedPrice,
      advanceAmount: advanceAmount || 0,
      pricingType,
      milestones,
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
        const skillQuery = buildSkillQuery(skillsText);
        if (skillQuery.$or) geoQuery.$or = skillQuery.$or;
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
            advanceAmount: 1,
            city: 1,
            country: 1,
            profilePic: 1,
            location: 1,
            category: 1,
            pricingType: 1,
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
        const skillQuery = buildSkillQuery(skillsText);
        if (skillQuery.$or) textQuery.$or = skillQuery.$or;
      }

      freelancers = await Freelancer.find(textQuery)
        .limit(50)
        .populate("user", "name email")
        .select(
          "title bio skills hourlyRate fixedPrice advanceAmount pricingType city country profilePic category",
        );
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
        userId: profile.user?._id, // ← User._id for chat (different from Freelancer._id)
        name: profile.user?.name,
        category: profile.category,
        title: profile.title,
        bio: profile.bio,
        skills: profile.skills,
        hourlyRate: profile.hourlyRate,
        fixedPrice: profile.fixedPrice,
        advanceAmount: profile.advanceAmount || 0,
        pricingType: profile.pricingType || "hourly",
        milestones: profile.milestones || [],
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
