const express = require("express");
const router = express.Router();
const {
    listPortfolioFromAmazon,
    listPortfolios,
    cronUpdatePortfolios,
} = require("../../controller/sp/portfolio.controller");
const { verifyToken } = require("../../middleware/auth.middleware");
const cron = require("node-cron");
const { write_logs } = require("../../winston/placement/logger");

// To fetch campaign from amazon (Not using currently)
router.post("/listPortfolioFromAmazon", verifyToken, listPortfolioFromAmazon);

// get portfolios by profileId
router.get("/portfolios/list/:profileId", verifyToken, listPortfolios);

// To update placementModifier key
cron.schedule(
    "50 22 * * *",
    async () => {
        console.log("cron run for 00:05 AM");
        write_logs({
            message: "Cron call => Portfolio update",
            log_type: "info",
        });
        cronUpdatePortfolios();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

module.exports = router;
