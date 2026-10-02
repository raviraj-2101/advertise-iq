const express = require("express");
const router = express.Router();
const { customerValidation } = require("../../validation/customer/customer.validation");
const { createCustomer, listCustomer, getCustomerById, updateCustomer, deleteCustomer, resendCustomerInvitation } = require("../../controller/customer/customerController");
const { verifyToken } = require("../../middleware/auth.middleware");
const { companyAuthorization } = require("../../middleware/customer.auth.middleware");

router.post("/createCustomer", verifyToken, companyAuthorization, customerValidation, createCustomer);
router.post("/getAllCustomer", verifyToken, companyAuthorization, listCustomer);
router.get("/getCustomerById/:id", verifyToken, companyAuthorization, getCustomerById);
router.put("/updateCustomer/:id", verifyToken, companyAuthorization, customerValidation, updateCustomer);
router.delete("/deleteCustomer/:id", verifyToken, companyAuthorization, deleteCustomer);
router.post("/resendCustomerInvitation/:email", verifyToken, companyAuthorization, resendCustomerInvitation);

module.exports = router;
