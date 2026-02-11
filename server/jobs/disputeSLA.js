import cron from "node-cron";
import Dispute from "../models/Dispute.js";

cron.schedule("0 3 * * *", async () => {
  console.log("Running dispute SLA job");

  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const stale = await Dispute.find({
    status: "open",
    createdAt: { $lte: fiveDaysAgo },
  });

  for (const d of stale) {
    d.status = "resolved";
    d.resolution = "release_to_freelancer";
    d.adminNotes = "Auto resolved by SLA";

    await d.save();
  }

  console.log("Resolved", stale.length);
});
