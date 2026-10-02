const express = require("express");
const {
    getSbKeywordList, cronSbKeywordReport
} = require("../../controller/sb/sbKeyword.controller");
const cron = require("node-cron");
const { write_logs } = require("../../winston/keyword/logger");
const router = express.Router();
const moment = require("moment-timezone");
const { verifyToken } = require("../../middleware/auth.middleware");

//get keyword List
router.post("/getKeywordList", verifyToken, getSbKeywordList);

cron.schedule(
    "54 2 * * *",
    async () => {
        console.log("Cron run getKeyword for 06:00 AM");

        write_logs({
            message: "Cron call => getSbKeyword for processing",
            log_type: "info",
        });
        await getSbKeywordList();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

cron.schedule(
    "55 2 * * *",
    async () => {
        console.log("cron run for 00:00 AM");
        write_logs({
            message: "Cron call => sbKeywordReport for processing",
            log_type: "info",
        });
        await cronSbKeywordReport();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

module.exports = router;
