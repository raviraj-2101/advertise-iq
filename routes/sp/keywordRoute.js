const express = require("express");
const {
  getKeywordList
} = require("../../controller/sp/keywordController");
const cron = require("node-cron");
const { write_logs } = require("../../winston/keyword/logger");
const router = express.Router();
const moment = require("moment-timezone");
const { verifyToken } = require("../../middleware/auth.middleware");

//get keyword List
router.post("/getKeywordList", verifyToken, getKeywordList);

cron.schedule(
  "28 0 * * *",
  async () => {
    console.log("Cron run getKeyword for 06:00 AM");

    write_logs({
      message: "Cron call => getKeyword for processing",
      log_type: "info",
    });
    await getKeywordList();
  },
  {
    timezone: "America/Los_Angeles",
  }
);

module.exports = router;
