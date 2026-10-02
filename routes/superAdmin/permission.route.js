const express = require("express");
const router = express.Router();
const {
  applyPermission,
  getAdminPermission,
  getPermissionByCompany,
  updateCompanyPermission,
  removeCompanyPagePermission,
} = require("../../controller/superAdmin/permission.controller");
const validation = require("../../validation/superAdmin/permission.validation");
const { verifyToken } = require("../../middleware/auth.middleware");
const { adminAuthorization } = require("../../middleware/admin.auth.middleware");

router.post(
  "/applyPermission",
  verifyToken,
  adminAuthorization,
  validation.applyPermisssionValidator,
  applyPermission
);

router.get(
  "/getPermissionByCompany/:companyId",
  verifyToken,
  adminAuthorization,
  getPermissionByCompany
);

router.post(
  "/updateCompanyPermission",
  verifyToken,
  adminAuthorization,
  validation.updatePermissionValidator,
  updateCompanyPermission
);

router.post(
  "/removeCompanyPagePermission",
  verifyToken,
  adminAuthorization,
  validation.removePermissionValidator,
  removeCompanyPagePermission
);

router.get("/getAdminPermission", verifyToken, getAdminPermission);
module.exports = router;
