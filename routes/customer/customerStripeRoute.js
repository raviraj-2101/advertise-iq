const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middleware/auth.middleware");
const { createCustomerStripe, createCustomerStripeSubscription, webhooks } = require("../../controller/customer/customerStripeController");

router.post("/create-customer", verifyToken, createCustomerStripe);
router.post("/create-subscription", verifyToken, createCustomerStripeSubscription);
router.post("/webhook", express.raw({ type: 'application/json' }), webhooks);

module.exports = router;
