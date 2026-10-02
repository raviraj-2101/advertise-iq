const express = require("express");
const router = express.Router();
const {
    getCampaignList, cronCampaignGenerateReport,
} = require("../../controller/sb/sbCampaign.controller");
const cron = require("node-cron");
const { write_logs } = require("../../winston/sbPlacement/logger");

// To add or update spCampaignList key
cron.schedule(
    "42 21 * * *",
    async () => {
        console.log("cron run for 00:10 AM");
        write_logs({
            message: "Cron call => SB Campaign fetched successfully",
            log_type: "info",
        });
        getCampaignList();
    },
    {
        timezone: "America/Los_Angeles",
    }
);


module.exports = router;
