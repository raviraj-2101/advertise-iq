const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middleware/auth.middleware");
const {
  deleteClient,
  getClientsRequestList,
  confirmClientPayment,
  getClientList,
  paymentStatus,
  getPaymentStatusList,
  InActiveClient,
} = require("../../controller/superAdmin/clientsController");
const { adminAuthorization } = require("../../middleware/admin.auth.middleware");

router.put("/deleteClient/:id", verifyToken, adminAuthorization, deleteClient);
router.put("/inActiveClient/:id", verifyToken, adminAuthorization, InActiveClient);
router.post("/getClientRequestList", verifyToken, adminAuthorization, getClientsRequestList);
router.post("/getClientList", verifyToken, adminAuthorization, getClientList);
router.post("/confirmClientPayment/:id", verifyToken, adminAuthorization, confirmClientPayment);
router.post("/paymentStatus/:id", verifyToken, adminAuthorization, paymentStatus);
router.post("/getPaymentStatusList", verifyToken, adminAuthorization, getPaymentStatusList);
module.exports = router;
