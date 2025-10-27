const express = require("express");
const router = express.Router();
const Freelancer = require("../models/Freelancer");

router.get("/search", async (req, res) => {
  const { long, lat, skills } = req.query;

  if (!long || !lat)
    return res.status(400).json({ success: false, msg: "Missing coordinates from client." });

  const longNum = parseFloat(long);
  const latNum = parseFloat(lat);

  let maxDist = 500000; // Start with 50km
  let freelancers = [];

  try {
    for (let i = 0; i < 5; i++) {
      const skillFilter = skills ? { skills: { $in: skills.split(",").map((s) => s.trim()) } } : {};

      freelancers = await Freelancer.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longNum, latNum] },
            distanceField: "distance",
            spherical: true,
            maxDistance: maxDist,
          },
        },
        { $match: skillFilter },
      ]);

      if (freelancers.length > 0) break;
      maxDist *= 2; // Expand radius if no results
    }

    if (freelancers.length === 0)
      return res.status(200).json({ success: true, msg: "No freelancers found nearby.", data: [] });

    res.status(200).json({ success: true, count: freelancers.length, data: freelancers });
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ success: false, msg: "Server error during search." });
  }
});

module.exports = router;