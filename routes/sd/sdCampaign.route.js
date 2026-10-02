const express = require("express");
const router = express.Router();
const {
    getCampaignList,
} = require("../../controller/sd/sdCampaign.controller");
const cron = require("node-cron");
const { write_logs } = require("../../winston/sdPlacement/logger");

// To add or update spCampaignList key
cron.schedule(
    "34 20 * * *",
    async () => {
        console.log("cron run for 00:10 AM");
        write_logs({
            message: "Cron call => SD Campaign fetched successfully",
            log_type: "info",
        });
        getCampaignList();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

module.exports = router;
