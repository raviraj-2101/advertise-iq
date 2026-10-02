const express = require("express");
const {
    getSdAdGroupList, cronSdAdGroupReport,
} = require("../../controller/sd/sdAdGroup.controller");
const router = express.Router();
const cron = require("node-cron");
const { write_logs } = require("../../winston/sdAdGroup/logger");
const moment = require("moment-timezone");
const { verifyToken } = require("../../middleware/auth.middleware");

router.post("/getAdGroupDataList", verifyToken, getSdAdGroupList);

// crons for update and get data 
cron.schedule(
    "15 2 * * *",
    async () => {
        console.log("cron run for 01:25 AM getAdGroup", new Date().toLocaleString());
        write_logs({
            message: "Cron call => SD getAdGroup for processing",
            log_type: "info",
        });
        await getSdAdGroupList();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

cron.schedule(
    "2 20 * * *",
    async () => {
        console.log("cron run for 00:00 AM");
        write_logs({
            message: "Cron call => adGroupReport for processing",
            log_type: "info",
        });
        await cronSdAdGroupReport();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

module.exports = router;
