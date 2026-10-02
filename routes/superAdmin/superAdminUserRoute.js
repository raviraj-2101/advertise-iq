const express = require("express");
const router = express.Router();
const { superAdminValidation } = require("../../validation/superAdmin/superAdmin.validation");
const { createSuperAdmin, listSuperAdmin, getSuperAdminById, updateSuperAdmin, deleteSuperAdmin, resendInvitation } = require("../../controller/superAdmin/superAdminController");
const { verifyToken } = require("../../middleware/auth.middleware");
const { adminAuthorization } = require("../../middleware/admin.auth.middleware");

router.post("/createSuperAdmin", verifyToken, adminAuthorization, superAdminValidation, createSuperAdmin);
router.post("/getAllSuperAdmins", verifyToken, adminAuthorization, listSuperAdmin);
router.get("/getSuperAdminById/:id", verifyToken, adminAuthorization, getSuperAdminById);
router.put("/updateSuperAdmin/:id", verifyToken, adminAuthorization, superAdminValidation, updateSuperAdmin);
router.delete("/deleteSuperAdmin/:id", verifyToken, adminAuthorization, deleteSuperAdmin);
router.post("/resendInvitation/:email", verifyToken, adminAuthorization, resendInvitation);

module.exports = router;
