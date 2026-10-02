const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const { verifyToken } = require("../../middleware/auth.middleware");
const {
    getOrdersFromSeller,
    getOrderItemsFromSeller,
    getOrderBuyerInfoFromSeller,
    getOrderAddressFromSeller,
    getOrderFromSeller,
    getOrdersFromDB,
    getOrderFromDB,
    cronJobOrdersFromSeller,
    cronJobOrderItemFromSeller,
    cronJobOrderBuyerInfoFromSeller,
    cronJobOrderAddressFromSeller,
} = require("../../controller/sellerPartner/orders.controller");
const {
    write_logs,
} = require("../../winston/orders/logger");

router.post("/getOrdersFromSeller", verifyToken, getOrdersFromSeller);
router.post("/getOrderItemsFromSeller", verifyToken, getOrderItemsFromSeller);
router.post(
    "/getOrderBuyerInfoFromSeller",
    verifyToken,
    getOrderBuyerInfoFromSeller
);
router.post(
    "/getOrderAddressFromSeller",
    verifyToken,
    getOrderAddressFromSeller
);
router.get(
    "/getOrderFromSeller/:amazonOrderId",
    verifyToken,
    getOrderFromSeller
);
router.get("/getOrderFromDB/:amazonOrderId", verifyToken, getOrderFromDB);
router.post("/getOrdersFromDB", verifyToken, getOrdersFromDB);
router.get("/cronJobOrdersFromSeller", cronJobOrdersFromSeller);
router.get("/cronJobOrderItemFromSeller", cronJobOrderItemFromSeller);
router.get("/cronJobOrderBuyerInfoFromSeller", cronJobOrderBuyerInfoFromSeller);
router.get("/cronJobOrderAddressFromSeller", cronJobOrderAddressFromSeller);

// cron.schedule("*/5 * * * *", async () => {
//     try {
//         write_logs({
//             message: `cronJobOrdersFromSeller`,
//             log_type: "info",
//         });
//         await cronJobOrdersFromSeller();
//     } catch (error) {
//         return write_logs({
//             message: `Main Catch Error: ${JSON.stringify(error)}`,
//             log_type: "error",
//         });
//     }
// });

// cron.schedule("* * * * *", async () => {
//     try {
//         write_logs({
//             message: `cronJobOrderItemFromSeller`,
//             log_type: "info",
//         });
//         await cronJobOrderItemFromSeller();
//     } catch (error) {
//         return write_logs({
//             message: `Main Catch Error: ${JSON.stringify(error)}`,
//             log_type: "error",
//         });
//     }
// });

// cron.schedule("* * * * *", async () => {
//     try {
//         write_logs({
//             message: `cronJobOrderBuyerInfoFromSeller`,
//             log_type: "info",
//         });
//         await cronJobOrderBuyerInfoFromSeller();
//     } catch (error) {
//         return write_logs({
//             message: `Main Catch Error: ${JSON.stringify(error)}`,
//             log_type: "error",
//         });
//     }
// });

// cron.schedule("* * * * *", async () => {
//     try {
//         write_logs({
//             message: `cronJobOrderAddressFromSeller`,
//             log_type: "info",
//         });
//         await cronJobOrderAddressFromSeller();
//     } catch (error) {
//         return write_logs({
//             message: `Main Catch Error: ${JSON.stringify(error)}`,
//             log_type: "error",
//         });
//     }
// });

module.exports = router;
