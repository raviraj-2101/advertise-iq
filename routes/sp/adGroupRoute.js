const express = require("express");
const {
  getAdGroupList,
} = require("../../controller/sp/adGroupController");
const router = express.Router();
const cron = require("node-cron");
const { write_logs } = require("../../winston/adGroup/logger");
const moment = require("moment-timezone");
const { verifyToken } = require("../../middleware/auth.middleware");

router.post("/getAdGroupDataList", verifyToken, getAdGroupList);

// crons for update and get data 
cron.schedule(
  "16 0 * * *",
  async () => {
    console.log("cron run for 01:25 AM getAdGroup", new Date().toLocaleString());
    write_logs({
      message: "Cron call => getAdGroup for processing",
      log_type: "info",
    });
    await getAdGroupList();
  },
  {
    timezone: "America/Los_Angeles",
  }
);

module.exports = router;
