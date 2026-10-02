const express = require("express");
const router = express.Router();

const {
    cronUpdateSellerToken, linkToAmazonSeller,
} = require("../../controller/sellerPartner/configAds.controller");
const cron = require("node-cron");
const { write_logs } = require("../../winston/updateToken/logger");
const { verifyToken } = require("../../middleware/auth.middleware");

router.post("/linkToAmazonSeller", verifyToken, linkToAmazonSeller);

// cron.schedule("*/20 * * * *", async () => {
//     try {
//         write_logs({
//             message: `cronUpdateSellerToken`,
//             log_type: "info",
//         });
//         await cronUpdateSellerToken();
//     } catch (error) {
//         return write_logs({
//             message: `Seller Main Catch Error: ${JSON.stringify(error)}`,
//             log_type: "error",
//         });
//     }
// });

module.exports = router;
