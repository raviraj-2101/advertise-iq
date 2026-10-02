const express = require("express");
const router = express.Router();
const { cronSpTargetReport, generateReport, cronDaySpTargetReport } = require("../../controller/sp/spTarget.controller");
const cron = require("node-cron");
const { write_logs } = require("../../winston/targeting/logger");
const { verifyToken } = require("../../middleware/auth.middleware");

// manually generate report in amaozn for sptarget
// router.post("/spgenerateReport", verifyToken, generateReport);

cron.schedule(
    "20 23 * * *",
    async () => {
        console.log("cron run for SPTarget at 5mins in every 3 Hours", new Date().toLocaleString());
        write_logs({
            message: "Cron call => spTargetReport for processing",
            log_type: "info",
        });
        await cronSpTargetReport();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

module.exports = router;
