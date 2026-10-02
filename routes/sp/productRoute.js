
const cron = require("node-cron");
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middleware/auth.middleware");
const { listProductFromAmazon, getProductList } = require("../../controller/sp/productController");
const { write_logs } = require("../../winston/products/logger");

router.get("/", listProductFromAmazon);
router.post("/getProductList", verifyToken, getProductList)

// To fetch product 45th minute of every hour,every day
cron.schedule(
    "30 22 * * *",
    async () => {
        write_logs({
            message: "Cron call => listProductFromAmazon",
            log_type: "info",
        });

        await listProductFromAmazon();
    },
    {
        timezone: "America/Los_Angeles",
    }
);

module.exports = router;
