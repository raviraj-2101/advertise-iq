const express = require("express");
const {
    getSbAdGroupList, cronSbAdGroupReport,
} = require("../../controller/sb/sbAdGroup.controller");
const router = express.Router();
const cron = require("node-cron");
const { write_logs } = require("../../winston/sbAdGroup/logger");
const moment = require("moment-timezone");
const { verifyToken } = require("../../middleware/auth.middleware");

router.post("/getAdGroupDataList", verifyToken, getSbAdGroupList);

// crons for update and get data 
cron.schedule(
    "15 2 * * *",
    async () => {
        console.log("cron run for 01:25 AM getAdGroup", new Date().toLocaleString());
        write_logs({
            message: "Cron call => SB getAdGroup for processing",
            log_type: "info",
        });
        await getSbAdGroupList();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

cron.schedule(
    "37 0 * * *",
    async () => {
        console.log("cron run for 00:00 AM");
        write_logs({
            message: "Cron call => adGroupReport for processing",
            log_type: "info",
        });
        await cronSbAdGroupReport();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

module.exports = router;
