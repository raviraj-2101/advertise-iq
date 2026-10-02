const express = require("express");
const router = express.Router();
const {
    getCampaignList,
} = require("../../controller/sp/spCampaign.controller");
const cron = require("node-cron");
const { write_logs } = require("../../winston/placement/logger");

// To add or update spCampaignList key
cron.schedule(
    "48 22 * * *",
    async () => {
        console.log("cron run for 00:10 AM");
        write_logs({
            message: "Cron call => Campaign fetched successfully",
            log_type: "info",
        });
        getCampaignList();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

module.exports = router;
