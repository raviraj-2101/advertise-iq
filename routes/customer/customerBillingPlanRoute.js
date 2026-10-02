const express = require("express");
const router = express.Router();
const {
  getBillingPlan,
  getPaymentDetail,
  paymentConfirmation,
  getBillingStatus,
  getSubscription,
  getHistory,
} = require("../../controller/customer/customerBillingPlanController");
const { verifyToken } = require("../../middleware/auth.middleware");

router.post("/billingPlan", verifyToken, getBillingPlan);
router.get("/paymentDetail", verifyToken, getPaymentDetail);
router.put("/paymentConfirmation/:id", verifyToken, paymentConfirmation);
router.get("/getBillingStatus", verifyToken, getBillingStatus);
router.post("/getSubscription", verifyToken, getSubscription);
router.post("/getHistory", verifyToken, getHistory);

module.exports = router;
