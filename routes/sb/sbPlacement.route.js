const express = require("express");
const router = express.Router();
const {
    generateReport,
    cronDayPlacementReport,
    cronPlacementReport,
    cronUpdatePlacementModifire,
    listCampaignFromAmazon,
    getPlacementAnother,
    getChildData,
    createCampaigns,

} = require("../../controller/sb/sbPlacement.controller");
const { verifyToken } = require("../../middleware/auth.middleware");
const cron = require("node-cron");
const { write_logs } = require("../../winston/sbPlacement/logger");

// To generate report manually if required else cronPlacementReport will automatically fetch on time interval
// router.post("/generateReport", verifyToken, generateReport);

// // To fetch campaign from amazon (Not using currently)
// router.post("/listCampaignFromAmazon", verifyToken, listCampaignFromAmazon);

// // To update placementModifier key
// router.post("/placementModifire", verifyToken, cronUpdatePlacementModifire);

// // Get API to fetch sponsered product from DB
// router.post("/getPlacement", verifyToken, getPlacementAnother);

// // get placements data by campaign Ids
// router.post("/getChildData", verifyToken, getChildData);

// router.post("/createCampaigns", verifyToken, createCampaigns)

cron.schedule(
    "31 21 * * *",
    async () => {
        console.log("cron run for 00:00 AM");
        write_logs({
            message: "Cron call => placementReport for processing",
            log_type: "info",
        });
        await cronPlacementReport();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

// cron.schedule(
//     "0 */2 * * *",
//     async () => {
//         console.log("cron run for 02:00 AM");
//         write_logs({
//             message: "Cron call => placementReport History for processing",
//             log_type: "info",
//         });
//         await cronDayPlacementReport();
//     },
//     {
//         timezone: "America/Los_Angeles",
//     }
// );

// // // To update placementModifier key
// cron.schedule(
//     "31 0 * * *",
//     async () => {
//         console.log("cron run for 01:20 AM");
//         write_logs({
//             message: "Cron call => placementModifier update",
//             log_type: "info",
//         });
//         cronUpdatePlacementModifire();
//     },
//     {
//         timezone: "America/Los_Angeles",
//     }
// );

module.exports = router;
